/**
 * 潮旋 / whirlpool 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 以内；自己不在坐骑上；目标身上还没有
 * `partiallytrapped`（已经卷着再放是浪费）。它是一处区域控制：适合先手拴住想跑的目标，或把近战目标拖在圈里。
 * 对谁出手：贴地移动的目标优先（水流从脚下起，地面单位最能被绕住）；`ai.preferMovers` 开启时只对正在移动或
 * 逃跑的威胁出手（用它的位移换对手的机动性）；关闭时对任何范围内的威胁都愿意放。焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑把身位收到射程内。
 * 放完之后：交回共享交战计划；目标仍带着水流时不再重复。
 */
namespace PokemonSkills {
    function whirlpoolMoving(target: CompanionBehavior.Entity): boolean {
        if (!target.velocity) return false;
        return Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]) > 0.05;
    }

    function whirlpoolWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "partiallytrapped")) return false;
        if (CompanionBehavior.ai<boolean>(item, "preferMovers", false)
            && !whirlpoolMoving(target) && !CompanionBehavior.fleeing(context, target)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    CompanionBehavior.registerUse("whirlpool", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return whirlpoolWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "partiallytrapped");
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !whirlpoolWants(context, capability, target)) return 0;
            let base = 14;
            if (target.grounded) base += 8;
            if (whirlpoolMoving(target)) base += 10;
            if (CompanionBehavior.fleeing(context, target)) base += 20;
            if (context.facts.focus === target.ref) base += 16;
            return base;
        }
    });

    addPreferences("whirlpool", {}, [
        field(pathOf("mire"), "滞水式", "boolean", {
            help: "开启：涡面更宽、回拉更紧、持续更久、冷却 +8，但灌水威力 ×0.85，用来把目标久久按在水里。关闭：涡面小、回拉弱、持续短、冷却更短，灌水满值，打完就撤。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 22, step: 1,
            help: "威胁离自己这么远以内才考虑潮旋；调小只在近处卷水，调大愿意从更远处先手拴住目标。"
        }),
        field(pathOf("ai.preferMovers"), "只卷移动目标", "boolean", {
            help: "开启：只对正在移动或逃跑的威胁卷水，优先剥夺对手的机动性；关闭：对任何范围内的威胁都愿意卷。贴地移动的目标本就会优先。"
        })
    ]);
}
