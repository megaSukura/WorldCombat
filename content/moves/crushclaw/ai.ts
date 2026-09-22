/**
 * 撕裂爪 / crushclaw 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase` 之内；更远交给共享接近逻辑。
 * `ai.ripOpen`（默认开）在目标已经带着破防身份（碎岩砸开的、铁尾砸凹的或别处留下的）时抬高优先级——
 * 本招撕在旧缺口上会多降一级，配合收益最高；关闭则把它当普通中近距离斩击排序。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("crushclaw", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "ripOpen", true)) return 20;
            return CompanionBehavior.status(context, target, "guardbroken") ? 32 : 18;
        }
    });

    addPreferences("crushclaw", {}, [
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不踏前撕裂，先走近。越大越愿意从稍远处先手撕抓。"
        }),
        field(pathOf("ai.ripOpen"), "撕旧缺口", "boolean", {
            help: "开启：目标已带任何来源的破防身份时优先撕裂，多降一级防御；关闭：当普通中近距离斩击排序。"
        })
    ]);
}
