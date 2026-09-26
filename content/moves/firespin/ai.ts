/**
 * 火焰旋涡 / firespin 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、还活着，且在 `ai.maxChase` 以内；自己不在坐骑上；身上还没有
 * `partiallytrapped`（已经卷着再放是浪费，重复施放只会替换旧火柱）。`ai.avoidWet` 开启时跳过当前湿透的
 * 目标——火柱一上身就会被浇灭，等于白放。
 * 对谁出手：正在移动或逃跑的目标优先（火柱跟着走，最能吃掉它们的机动性），焦点目标另加一档。
 * 够不到怎么办：交给共享接近逻辑把身位收到射程内。
 * 放完之后：交回共享交战计划；目标仍带着火柱时不再重复。
 */
namespace PokemonSkills {
    function firespinMoving(target: CompanionBehavior.Entity): boolean {
        if (!target.velocity) return false;
        return Math.sqrt(target.velocity[0] * target.velocity[0] + target.velocity[2] * target.velocity[2]) > 0.05;
    }

    function firespinWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "partiallytrapped")) return false;
        if (CompanionBehavior.ai<boolean>(item, "avoidWet", true) && target.wet) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 11);
    }

    CompanionBehavior.registerUse("firespin", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return firespinWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible
                && !CompanionBehavior.status(context, target, "partiallytrapped");
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !firespinWants(context, capability, target)) return 0;
            let base = 14;
            if (firespinMoving(target)) base += 12;
            if (CompanionBehavior.fleeing(context, target)) base += 18;
            if (context.facts.focus === target.ref) base += 16;
            return base;
        }
    });

    addPreferences("firespin", {}, [
        field(pathOf("blaze"), "猛火式", "boolean", {
            help: "开启：灼烧威力 ×1.1、间隔更短、点燃率更高、火柱更粗，但持续 ×0.8、冷却 +6，打得更凶也更快结束。关闭：烧得更久更稳，适合慢慢磨。"
        }),
        field(pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 2, max: 22, step: 1,
            help: "威胁离自己这么远以内才考虑点火；调小只在近处烧，调大愿意从更远处先手缠上。"
        }),
        field(pathOf("ai.avoidWet"), "避开湿透目标", "boolean", {
            help: "开启：目标当前湿透时不点火（火柱会被浇灭，等于白放）；关闭：照点不误，也可以用来逼对手离开水里。"
        })
    ]);
}
