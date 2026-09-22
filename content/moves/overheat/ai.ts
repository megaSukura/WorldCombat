/**
 * 过热 / overheat 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 13）格之内；更远先交给共享接近逻辑。
 * 对谁出手：`ai.finish`（默认开）打开时残血目标排前——一张扇面正好把残血的几个一起收掉；
 *   身边挤着更多敌人的目标也排前（扇面能一次烧到几个人）；特攻高于物攻的个体更愿意用它。
 * 够不到怎么办：reach 就是本招射程，不够就靠近。
 * 放完之后：一记扇形高热并在地上留焦痕；过载式用完自身特攻掉得更多，交回共享交战计划等冷却。
 */
namespace PokemonSkills {
    function overheatWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
    }

    function overheatCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const nearby: CompanionBehavior.Entity[] = context.facts.nearby || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("overheat", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return overheatWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !overheatWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            let score = 20;
            if (CompanionBehavior.distance(self.point, target.point) <= capability.data.range) score += 7;
            if (CompanionBehavior.ai<boolean>(capability, "finish", true) && CompanionBehavior.ratio(target) < 0.5) score += 6;
            if (overheatCluster(context, target) > 0) score += 5;
            if ((context.facts.specialAttack || 0) >= (context.facts.attack || 0)) score += 4;
            return score;
        }
    });

    addPreferences("overheat", {}, [
        field(pathOf("vent"), "过载式", "boolean", {
            help: "开启：威力 ×1.25，但自身特攻多掉一级（共 3 级）、起手 +2 刻、冷却 +4 刻。关闭（收束式）：威力 ×1.0、只掉原生 2 级、出手更快，能连着用。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 5, max: 18, step: 1,
            help: "超过这个距离就不主动排热，先走近；越大越愿意在更远处先手。"
        }),
        field(pathOf("ai.finish"), "优先收残血", "boolean", {
            help: "开启：残血目标排前，用一张扇面把残血的几个一起收掉；关闭则所有目标同价。"
        })
    ]);
}
