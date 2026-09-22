/**
 * 群魔乱舞 / infernalparade 的 AI 用途。
 *
 * 什么局面下出手：追踪的鬼火远程，对手可见、敌对、活着且在 `ai.maxChase` 之内即可。
 * 它只要目标带着**任意异常**（灼伤、麻痹、中毒／剧毒、冰冻、睡眠）就翻倍，所以对这样的目标 priority 抬到 45，
 * 否则 16——它乐于先让别的招上状态，再用乱舞收。
 */
namespace PokemonSkills {
    /** 目标身上是否带着任意主异常；用于把吃倍率的候选排到前面。 */
    function infernalparadeAfflicted(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.status(context, target, "burn") || CompanionBehavior.status(context, target, "paralysis")
            || CompanionBehavior.status(context, target, "poison") || CompanionBehavior.status(context, target, "frozen")
            || CompanionBehavior.status(context, target, "sleep");
    }

    CompanionBehavior.registerUse("infernalparade", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 13);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            return infernalparadeAfflicted(context, target) ? 45 : 16;
        }
    });

    addPreferences("infernalparade", {}, [
        field(pathOf("dirge"), "挽歌", "boolean", {
            help: "开启：鬼火多一团、追踪转向 ×1.3，但飞行速度 ×0.8、收招与冷却各多 2／5 刻。关闭：更快更省，转向按基准。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 24, step: 1,
            help: "超过这个距离就不主动起舞，先走近。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为找射界离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
