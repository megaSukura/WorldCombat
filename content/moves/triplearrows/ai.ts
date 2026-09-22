/**
 * 三连箭 / triplearrows 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。
 * `ai.chipFirst` 开启（默认）时，**还没被踢开护架**（不带 `world_combat:status/guardbroken`）的目标
 * priority 36，已带破防的降到 12，其余 22——先把护架踢开，好让三箭钉在要害上（踢开才必暴击）。
 * 对谁出手：`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("triplearrows", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            if (!CompanionBehavior.ai<boolean>(capability, "chipFirst", true)) return 22;
            return CompanionBehavior.status(context, target, "guardbroken") ? 12 : 36;
        }
    });

    addPreferences("triplearrows", {}, [
        field(pathOf("fan"), "扇形齐射", "boolean", {
            help: "开启：三箭散开 14°，每支轻 15%，用来同时打挤在一起的目标，冷却更久；关闭：三箭几乎同一点、每支重 5%，单体更狠。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不出手，先走近。越大越愿意从稍远处先手。"
        }),
        field(pathOf("ai.chipFirst"), "先踢开护架", "boolean", {
            help: "开启：优先对还没被踢开护架的目标出手，先把缺口打开好让三箭暴击；关闭：当普通中距离攻击排序。"
        })
    ]);
}
