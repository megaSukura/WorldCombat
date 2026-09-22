/**
 * 龙卷风 / twister 的伙伴 AI 用途。
 *
 * 什么局面下出手：中距离的一道持续旋涡，对手可见、敌对、还活着且在 `ai.maxChase`（默认 12）格内。
 * 它是要锁住一片地的控场招：`ai.cluster` 打开时，目标身边 3.5 格内还挤着别的敌人就抬高 priority；
 * 单挑时当普通远程攻击。旋涡立在原地、施法者要站着转完，所以不指望用它追击。
 */
namespace PokemonSkills {
    function twisterWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    function twisterCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
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
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return 16;
            return twisterCluster(context, target) >= 2 ? 30 : 16;
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
