/**
 * 魔法叶 / magicalleaf 的 AI 用途。
 *
 * 什么局面下出手：考虑距离内有可见、且中间没有整面墙挡住的敌对目标就列入候选；够不到交给共享接近逻辑。
 * 叶会逐片重新读取准线并拐弯，所以正在移动的对手、以及射程远端的对手都略微加权（`ai.trackMovers` 默认开）。
 * 目标在叶飞行途中离场时，尚未发出的叶会按下一片自己的准线重新选择；AI 因此重视持续开阔的输出窗口。
 */
namespace PokemonSkills {
    /** 目标与自身之间是否有一条可以飞叶的空路；同一决策帧内缓存。 */
    function magicalleafClear(context: WorldBehavior.Context, target: WorldMethods.Subject): boolean {
        return CompanionBehavior.observedFlag(context, "magicalleaf:clear:" + target.ref, function () {
            const world = CompanionBehavior.world(context), self = CompanionBehavior.source(context);
            return world.clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point));
        });
    }

    CompanionBehavior.registerUse("magicalleaf", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 15)) return false;
            return magicalleafClear(context, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const gap = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            const range = capability.data.range;
            let base = gap <= range ? 20 : 0;
            if (CompanionBehavior.ai<boolean>(capability, "trackMovers", true)) {
                const velocity = CompanionBehavior.velocity(context, target);
                if (velocity && (velocity[0] * velocity[0] + velocity[2] * velocity[2]) > 0.0004) base += 10;
            }
            if (typeof range === "number" && gap > range * 0.75) base += 6;
            return base;
        }
    });

    addPreferences("magicalleaf", { ai: { maxChase: 15, trackMovers: true } }, [
        field(pathOf("ai.maxChase"), "射击距离", "number", {
            min: 4, max: 26, step: 1,
            help: "超过这个距离就不主动散叶，先走近。越大越会在更远处先手。"
        }),
        field(pathOf("ai.trackMovers"), "追动目标", "boolean", {
            help: "开启后，正在移动的敌人优先成为散叶目标（叶会逐片拐弯拦在前面）；关闭则只按普通远程攻击排序。"
        })
    ]);
}
