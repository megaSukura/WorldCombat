/**
 * 伏特替换 / voltswitch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、存活，且在 `ai.maxChase`（默认 12 格）以内——本招是远程，站远也能点。
 * 对谁出手：被打崩前放电脱身（`ai.fleeBelow`，默认 0.4 以下排最前，因为它出手即换位）；其次收掉残血目标；
 *   余电式还看**自己现在站的原点**周围挤着几个敌人来加权——余电留在原地，价值只看留在那里的敌人，不数远端目标周围。
 * 够不到怎么办：reach 就是本招射程，不够就先走近。
 * 放完之后：身位已经跳到新的落点，交回共享交战计划。
 */
namespace PokemonSkills {
    function voltswitchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
    }

    /** 自己离开的这个原点周围还挤着几个非友方；余电式据此提高优先级（余电留在原地，不在远端目标周围）。 */
    function voltswitchCluster(context: WorldBehavior.Context): number {
        const self = CompanionBehavior.source(context);
        const radius = p("voltswitch", "fieldRadius", CompanionBehavior.world(context));
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= radius) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("voltswitch", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            return !target || voltswitchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !voltswitchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 16;
            if (CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "fleeBelow", 0.4)) score += 18;
            if (CompanionBehavior.ratio(target) <= 0.35) score += 10;
            if (CompanionBehavior.ai<boolean>(capability, "relay", true)) score += Math.min(10, voltswitchCluster(context) * 4);
            return score;
        }
    });

    addPreferences("voltswitch", {}, [
        field(pathOf("relay"), "余电式", "boolean", {
            help: "开启：放电后在原地留下一片会电击的电荷区（范围压力、封走位），但电弧威力 ×0.85、冷却 +6 刻、切换距离 ×0.85。关闭（直放式）：电弧威力 ×1.2、切换 ×1.2 跳得更远，代价是原地什么都不留。"
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
            help: "开启后，驻守命令下也会瞬移脱离；关闭则只在原地方便时施放。"
        })
    ]);
}
