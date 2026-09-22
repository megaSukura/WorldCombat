/**
 * 扑击 / bodypress 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内。它是一记慢、要顶住的近身推，
 * 所以只在自身生命高于 `ai.minHealth`（默认 0.35）、或对手已经很低时排到前面；够不到交给共享接近逻辑。
 * 自身生命还充裕时 `priority` 抬一点，让它在多个近身候选里先顶——这正是“以守为攻”的用法。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("bodypress", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.35);
            return CompanionBehavior.ratio(CompanionBehavior.source(context)) >= minHealth || CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const close = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= capability.data.range;
            if (!close) return 0;
            const healthy = CompanionBehavior.ratio(CompanionBehavior.source(context)) >= 0.6;
            return healthy ? 30 : 18;
        }
    });

    addPreferences("bodypress", {}, [
        field(pathOf("grind"), "碾推式", "boolean", {
            help: "开启：撞击摊成更长的持续顶推、把目标推得更远，但单发更轻、收招与冷却更久；关闭：硬停式，单发更重、几乎一下推完。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不主动发起扑击，先走近。越大追击越执着，也越容易在顶住前被拉开。"
        }),
        field(pathOf("ai.minHealth"), "保留生命", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "自身生命低于这个比例时不再主动扑击（除非对手已残）。越高越珍惜自己，也越少在残血时硬顶。"
        })
    ]);
}
