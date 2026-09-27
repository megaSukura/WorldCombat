/**
 * 暗影爪 / shadowclaw 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 目标是 `kind: "aim"`，AI 用对手位置推荐一个落点：只读地用 `p(id,key,{world,actor,skill,detail:{values:config}})`
 * 求出这只个体、这份配置下的实际 `tempo` + `lag`，把移动中的目标预判到它即将到达的位置，再用
 * `SurfacePaths.support` 确认那里确有可承影地表，没有就退回当前目标。这样影带铺过去时爪才抓得到同一条回抓线。
 * `ai.strikeUnseen`（默认开）打开时，若目标当前正攻击**另一个友方**（被队友牵制），priority 抬到 42——
 * 那正是暗算窗口，这一爪吃满加成。目标空闲（没有攻击对象）不算偷袭，仍按普通中近距离抓击排序：
 * 它的加成条件只是「当前攻击目标不是施法者且确实在打别人」，不假称做过视线检测。
 * 宽体 Boss 更难被走位甩开，也略微加分。放完之后：交回共享交战计划；这一爪不改站位、也不退开。
 */
namespace PokemonSkills {
    /** 目标当前是否正被队友牵制：攻击对象是一个不是自己的友方。 */
    function shadowclawTiedUp(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        if (!target.attacking) return false;
        const attacked = CompanionBehavior.entity(context, target.attacking);
        if (attacked === null) return false;
        const self = CompanionBehavior.source(context);
        return attacked.friendly && attacked.ref !== self.ref;
    }

    CompanionBehavior.registerUse(shadowclawId, {
        protocols: ["world_combat:attack"],
        target: function (context, item, target) {
            const velocity = target.velocity || [0, 0, 0];
            const speed = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
            if (!(speed >= 0.05) || target.grounded === false) return target;
            const access = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            const from = CompanionBehavior.point(self.point);
            const heading = WorldGeometry.flatUnit(CompanionBehavior.point(target.point).minus(from));
            // 实际落点在提交后锁死：只读求这只个体/这份配置的真实起手 + 回抓延时，再把位移限制在射程内。
            let leadTicks = (skills[shadowclawId].prepare || 8) + 6;
            try {
                const values = { world: access, actor: access.source(), skill: skills[shadowclawId], detail: { values: item.data.config } };
                leadTicks = Math.max(1, Math.round(p(shadowclawId, "tempo", values) + p(shadowclawId, "lag", values)));
            } catch (error) { }
            let dx = velocity[0] * leadTicks, dz = velocity[2] * leadTicks;
            const span = Math.sqrt(dx * dx + dz * dz), cap = Math.max(0.5, item.data.range * 0.8);
            if (span > cap) { dx *= cap / span; dz *= cap / span; }
            const lead = CompanionBehavior.point(target.point)
                .plus(WorldCombat.point(dx, 0, dz)).minus(heading.scale(0.3));
            const point = SurfacePaths.support(access, lead, 0.6, 2);
            if (point === null || point.minus(from).length() > item.data.range) return target;
            const choice = JSON.parse(JSON.stringify(target));
            choice.ref = ""; choice.point = [point.x(), point.y(), point.z()];
            return choice;
        },
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, item, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            let score = 24;
            if (CompanionBehavior.ai<boolean>(capability, "strikeUnseen", true) && shadowclawTiedUp(context, target)) score = 42;
            if (typeof target.width === "number" && target.width >= 1.4) score += 6;
            return score;
        }
    });

    addPreferences(shadowclawId, {}, [
        field(pathOf("deep"), "深影式", "boolean", {
            help: "开启：威力 ×1.12、影铺远 0.6 格、暗算加成多 0.1、回抓更从容，代价是起手多 3 刻、冷却多 8 刻；关闭：出手更快、爪面宽 0.12 格、回抓更急、冷却更短，威力 ×0.94。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出手，先走近；越大越愿意从稍远处先手。"
        }),
        field(pathOf("ai.strikeUnseen"), "偷袭窗口", "boolean", {
            help: "开启：目标正被队友牵制、攻击对象不是自己时优先出手（暗算加成满额）；关闭：不挑时机，按普通中近距离抓击排序。"
        })
    ]);
}
