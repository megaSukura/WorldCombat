/**
 * 岩石封锁 / rocktomb 的 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、还活着，且在 `ai.maxChase`（默认 8）格内；更远交给共享接近逻辑。
 * `ai.sealRunner` 开启（默认）时按局面排序：目标正在移动/逃跑时最值（围栏就是为追身准备的），
 * 站在地上、还没被封的排其次；已经带着封锁身份的目标降到很后（重复封没有意义）；
 * 离地的目标围不住，也降到很后。
 * 对谁出手：`accepts` 只筛阵营、存活与可见，不筛距离（距离归 `approach`）。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("rocktomb", {
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
            if (!CompanionBehavior.ai<boolean>(capability, "sealRunner", true)) return 22;
            if (CompanionBehavior.status(context, target, "encased")) return 8;
            if (target.grounded === false) return 10;
            return CompanionBehavior.fleeing(context, target) ? 40 : 22;
        }
    });

    addPreferences("rocktomb", {}, [
        field(pathOf("trap"), "封场式", "boolean", {
            help: "开启：围栏更宽更高、压两级速度、石头留得更久，但单发更轻；关闭：砸得更重、只压一级、围栏短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 18, step: 1,
            help: "超过这个距离就不投石封锁，先走近。越大越愿意从稍远处先手封人。"
        }),
        field(pathOf("ai.sealRunner"), "封跑动的人", "boolean", {
            help: "开启：目标正在移动或逃跑时优先投石，未落地的目标与已被封的目标降到最后；关闭：当普通中距离攻击排序。"
        })
    ]);
}
