/**
 * 伏特替换 / voltswitch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 12 格）以内——本招是远程，站远也能点。
 * 对谁出手：被打崩前放电脱身（`ai.fleeBelow`，默认 0.4 以下排最前，因为它出手即换位）；其次收掉残血目标；
 *   换手式（`relay` 关闭）且自己血量低、手上有合法后备时更愿意出手，因为换手正好把残血个体收回。
 * 落点安全：出手前用本招真实的 blink／arc 公式算出身后落点，拿原生空域探针核对一次；站不下就不推荐，
 *   免得白白原地收招。
 * 够不到怎么办：reach 就是本招射程，不够就先走近。
 * 驻守：收到「驻守」指令且未开 `ai.leaveStation` 时不使用，因为本招必然瞬移离位。
 * 放完之后：身位已经跳到新的落点，交回共享交战计划。
 */
namespace PokemonSkills {
    function voltswitchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    /** 换手式是否有可上场的合法后备；没有后备时换手式跟在原地留守没区别。 */
    function voltswitchHasReserve(context: WorldBehavior.Context): boolean {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const actor = world.actor(self.ref);
        return !!actor && partyReserve(partyRoster(world, actor), partyActiveId(world, actor)) !== null;
    }

    /** 出手前用本招真实的 blink／arc 算出身后的落点，再拿原生空域探针核对一次是否站得下。 */
    function voltswitchSafeLanding(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
        const actor = world.actor(self.ref);
        if (!actor || typeof (world as any).freeSpace !== "function") return true;
        const body = world.observe(actor);
        if (body === null) return true;
        const flat = WorldCombat.point(target.point[0] - self.point[0], 0, target.point[2] - self.point[2]);
        if (flat.length() < 0.01) return true;
        const heading = flat.unit(), lateral = WorldCombat.point(-heading.z(), 0, heading.x());
        const source = { world: world, actor: actor, skill: skills["voltswitch"], detail: { values: capability.data.config || {} } };
        const blink = p("voltswitch", "blink", source), arc = p("voltswitch", "arc", source);
        const feet = WorldCombat.point(self.point[0] - heading.x() * blink + lateral.x() * arc,
            self.point[1] - body.height() / 2, self.point[2] - heading.z() * blink + lateral.z() * arc);
        return world.freeSpace(feet, body.width(), body.height());
    }

    CompanionBehavior.registerUse("voltswitch", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay")
                && !CompanionBehavior.ai<boolean>(capability, "leaveStation", false)) return false;
            return !target || voltswitchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !voltswitchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const config = capability.data.config || {};
            let score = 16;
            const low = CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "fleeBelow", 0.4);
            if (low) score += 18;
            if (CompanionBehavior.ratio(target) <= 0.35) score += 10;
            // 换手式且残血、手上有后备：换手正好把残血个体收回，比留守更值。
            if (config.relay !== true && low && voltswitchHasReserve(context)) score += 10;
            // 身后没有站得下的落点就不推荐，免得原地收招浪费一次出手。
            if (low && !voltswitchSafeLanding(context, capability, target)) score -= 20;
            return Math.max(0, score);
        }
    });

    addPreferences("voltswitch", {}, [
        field(pathOf("relay"), "留守式", "boolean", {
            help: "开启（留守式）：放电瞬移后原地留下继续战斗，但电弧威力 ×0.85、冷却 +6 刻、切换距离 ×0.85。关闭（换手式）：电弧威力 ×1.2、切换 ×1.2 跳得更远，有合法后备时直接与待命的一只换手。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 18, step: 1,
            help: "超过这个距离就不主动放电，先靠近；本招是远程，调大更愿意远距离换位，调小则只在近处点。"
        }),
        field(pathOf("ai.fleeBelow"), "脱身血量", "number", {
            min: 0.15, max: 0.9, step: 0.05,
            help: "自己血量比例低于这个值时，把伏特替换排到最前用来放电脱身；调高更早脱身，调低只在濒危时才用。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会瞬移脱离；关闭则收到驻守指令时不用本招（本招必然离位）。"
        })
    ]);
}
