/**
 * 污泥波 / sludgewave 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、慢而黏的污泥潮。`available` 要求有可见、敌对、存活
 * 且落在 `ai.maxChase`（默认 8）格内的目标；目标背后还挤着别的人时最值（`ai.cluster`）。
 * 目标还没中毒时略优先（毒会持续掉血）。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function sludgewaveWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    function sludgewaveCluster(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        var nearby = context.facts.nearby as CompanionBehavior.Entity[], count = 1;
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            if (CompanionBehavior.distance(other.point, target.point) <= 3.5) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("sludgewave", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return sludgewaveWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        approachTarget: function (context, capability, target) { return target; },
        priority: function (context, capability, target) {
            if (!target || !sludgewaveWants(context, capability, target)) return 0;
            var base = 18;
            if (!CompanionBehavior.status(context, target, "poison")) base += 8;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return sludgewaveCluster(context, target) >= 2 ? base + 16 : base;
        }
    });

    addPreferences("sludgewave", {}, [
        field(pathOf("surge"), "涌浪式", "boolean", {
            help: "开启：污泥潮更慢更远、把人推得更动，但单次威力约少 24%%，适合一次漫过一片地。关闭：一发更厚更重的拍击、半径最窄、来得更快。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动漫潮，先朝目标走近。越大越愿意先接近再推。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，目标身边 3.5 格内还挤着别的敌人时优先漫污泥，一次泡到一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
