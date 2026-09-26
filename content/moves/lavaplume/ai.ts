/**
 * 喷烟 / lavaplume 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、向上竖喷的烟柱，威胁正上方与贴身空间。`available` 要求有可见、敌对、存活
 * 且落在 `ai.maxChase`（默认 8）格内的目标；`ai.lofted` 打开时，目标正处在自己上方（或在往上压）就抬高 priority，
 * 高大的 Boss 近身也略优先——它不看水平方向的成片敌群，因为柱子的横向范围有限。目标还没被烧着时略优先。
 * 够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function lavaplumeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
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
            if (!CompanionBehavior.status(context, target, "burn")) base += 6;
            var self = CompanionBehavior.source(context).point;
            if (CompanionBehavior.ai<boolean>(capability, "lofted", true) && target.point[1] - self[1] > 1.2) base += 14;
            var height = typeof target.height === "number" ? target.height : 1.4;
            if (height >= 2.0) base += 8;
            return base;
        }
    });

    addPreferences("lavaplume", {}, [
        field(pathOf("fume"), "浓烟式", "boolean", {
            help: "开启：烟柱约少 12%%，但同一根柱内留下一层余热，反复烫没走开的人，冷却 +10 刻，用来封住你的正上方与脚边。关闭：一发更重的烟柱、没有余热，冷却更短，用来打疼贴身与低空的敌人。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动靠近，先在烟柱射程外待命。越大越愿意先朝目标接近再喷。"
        }),
        field(pathOf("ai.lofted"), "对空优先", "boolean", {
            help: "开启后，目标处在自己上方（或正往上压）时优先喷烟，高大的 Boss 近身也略优先；关闭则只按普通攻击排序。"
        })
    ]);
}
