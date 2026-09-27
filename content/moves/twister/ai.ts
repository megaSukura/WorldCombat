/**
 * 龙卷风 / twister 的伙伴 AI 用途。
 *
 * 什么局面下出手：中距离的一道持续旋涡，对手可见、敌对、还活着且在 `ai.maxChase`（默认 12）格内。
 * 它是要锁住一片地的控场招：`ai.cluster` 打开时，目标身边 3.5 格内还挤着别的**有通视**的敌人就抬高 priority；
 * 单挑时当普通远程攻击。维持旋涡要把自己钉在原地，所以自身越虚弱越不划算，也不指望用它追击。
 */
namespace PokemonSkills {
    function twisterWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    /** 估计旋涡真能卷到几个敌人：以落点（目标处）为轴，只数有通视的敌人，隔墙的不算。 */
    function twisterReachable(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], world = CompanionBehavior.world(context);
        var anchor = CompanionBehavior.point(target.point), count = 0;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.friendly || other.health <= 0 || !other.visible) continue;
            if (other.ref !== target.ref && CompanionBehavior.distance(other.point, target.point) > 3.5) continue;
            if (world.clear(anchor, CompanionBehavior.point(other.point))) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("twister", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return twisterWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !twisterWants(context, capability, target)) return 0;
            var score = 16;
            if (CompanionBehavior.ai<boolean>(capability, "cluster", true) && twisterReachable(context, target) >= 2) score = 30;
            // 当前射程越远，越能从安全处立涡、维持时越不易被贴脸。
            var reach = Number(capability.data && capability.data.range);
            if (isFinite(reach) && reach >= 10) score += 2;
            // 维持旋涡要把自己钉在原地；血少时不再拿命去锁场。
            if (CompanionBehavior.ratio(CompanionBehavior.source(context)) < 0.4) score -= 8;
            return Math.max(4, score);
        }
    });

    addPreferences("twister", {}, [
        field(pathOf("hold"), "持续涡旋", "boolean", {
            help: "开启：旋涡转得更久、牵引更强，但每段风刃约少 15%%、冷却更长，用来锁住一片地。关闭：转得更短、牵引更弱，但每段风刃约多 20%%、冷却更短。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 4, max: 20, step: 1,
            help: "超过这个距离就不主动立涡，先走近。越大越会在远处先手，目标也越容易走出旋涡边缘。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还站着别的敌人时优先立涡，一次卷住一片；关闭则只按普通攻击排序。"
        })
    ]);
}
