/**
 * 冰冻拳 / icepunch 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.finishFrozen`（默认开）打开时，已经带寒霜（`world_combat:status/chill`）或浸水的目标排得最前
 *   ——那一拳能把它们冻住；没结霜的目标排后，用来起手。
 * 够不到怎么办：冰拳射程短，reach 之内才动手，不够先贴近。
 * 放完之后：冻住的目标交回共享交战计划，让队友在冻结窗口里输出。
 */
namespace PokemonSkills {
    function icepunchWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
    }

    CompanionBehavior.registerUse("icepunch", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return icepunchWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !icepunchWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            let score = 20;
            if (CompanionBehavior.ai<boolean>(capability, "finishFrozen", true) && CompanionBehavior.status(context, target, "chill")) score += 18;
            if (target.wet) score += 10;
            if (CompanionBehavior.status(context, target, "frozen")) score -= 12;
            return score;
        }
    });

    addPreferences("icepunch", {}, [
        field(pathOf("deepfreeze"), "深冻式", "boolean", {
            help: "开启：冻结时长 ×1.4、寒霜时长 ×1.2，但拳威 ×0.9、冷却 +5 刻——锁住关键目标。关闭（急冻式）：拳更重、循环更快，但控制更短。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 12, step: 1,
            help: "超过这个距离就不主动出拳，先走近。冰拳射程很短，设大也常常够不到。"
        }),
        field(pathOf("ai.finishFrozen"), "优先收结霜/浸水目标", "boolean", {
            help: "开启：已经带寒霜或站在水里的目标排得最前，这一拳能把它们冻住；关闭则只按普通近战排序。"
        })
    ]);
}
