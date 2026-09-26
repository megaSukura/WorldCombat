/**
 * 三连箭 / triplearrows 的 AI 用途。
 *
 * 选取是 aim：玩家可自由点方向或扇射，AI 仍按仇恨为攻击用途推荐敌人。什么局面下出手：对手可见、敌对、还活着，
 * 且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。`ai.chipFirst` 开启（默认）时，**还没被踢开护架**
 * 的目标优先：近身（≤4.5 格）时腿箭组合最值，已带破防标记的降到很后；远一点的局面腿够不到，只当箭雨打。
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
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            const close = distance <= 4.5;
            if (!CompanionBehavior.ai<boolean>(capability, "chipFirst", true)) return close ? 30 : 22;
            if (CompanionBehavior.status(context, target, "guardbroken")) return close ? 14 : 10;
            return close ? 40 : 30;
        }
    });

    addPreferences("triplearrows", {}, [
        field(pathOf("fan"), "扇形齐射", "boolean", {
            help: "开启：三箭散开 14°，每支轻 15%，用来同时打挤在一起的目标，冷却更久；关闭：三箭几乎同一点、每支重 5%，单体更狠。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不出手，先走近。越大越愿意从稍远处先手（远处腿够不到，只会送三箭）。"
        }),
        field(pathOf("ai.chipFirst"), "先踢开护架", "boolean", {
            help: "开启：近身时优先对还没被踢开护架的目标出手，先把缺口打开好让三箭暴击；远距腿够不到，只当箭雨排序。关闭：当普通中距离攻击排序。"
        })
    ]);
}
