/**
 * 碎岩 / rocksmash 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑走近。
 * 它是最便宜的一记，所以 default 优先级不高；`ai.chipFirst`（默认开）在目标还没带破防身份时抬高优先级——
 * 先把缺口砸开，队友或重击才好兑现；目标已经带着破防身份（别人开的或自己刚砸的）就降下来，避免白拆。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("rocksmash", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 7);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "chipFirst", true)) return 16;
            return CompanionBehavior.status(context, target, "guardbroken") ? 6 : 20;
        }
    });

    addPreferences("rocksmash", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动碎岩，先走近。越大越愿意从稍远处先手连拳。"
        }),
        field(pathOf("ai.chipFirst"), "先砸缺口", "boolean", {
            help: "开启：优先对还没带破防身份的目标碎岩，先把防御砸低；关闭：把碎岩当普通近身快攻排序。"
        })
    ]);
}
