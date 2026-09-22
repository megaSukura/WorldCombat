/**
 * 喷烟 / lavaplume 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、先立柱再塌环的火圈。`available` 要求有可见、敌对、存活
 * 且落在 `ai.maxChase`（默认 8）格内的目标；`ai.cluster` 打开时，目标身边 3.5 格内还挤着人就抬高 priority
 * ——那正是这一发最值的时候。目标还没被烧着时略优先（火会持续掉血）。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function lavaplumeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    function lavaplumeCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("lavaplume", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return lavaplumeWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !lavaplumeWants(context, capability, target)) return 0;
            var base = 18;
            if (!CompanionBehavior.status(context, target, "burn")) base += 8;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return lavaplumeCluster(context, target) >= 2 ? base + 16 : base;
        }
    });

    addPreferences("lavaplume", {}, [
        field(pathOf("fume"), "浓烟式", "boolean", {
            help: "开启：火环约少 12%%，但退去后地上留一层闷烧余烬，反复烫没走开的人，冷却 +10 刻，用来封住一片地。关闭：一发更重的火环、没有余烬，冷却更短，用来打疼一群人。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动靠近，先在火环射程外待命。越大越愿意先朝目标接近再烧。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还挤着别的敌人时优先喷烟，一次烧到一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
