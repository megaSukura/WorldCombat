/**
 * 污泥波 / sludgewave 的伙伴 AI 用途。
 *
 * 什么局面下出手：一个以自身为中心、近身一次泼开的三维泥幕。`available` 要求有可见、敌对、存活
 * 且落在 `ai.maxChase`（默认 8）格内的目标；`ai.cluster` 打开时按**自身体周**的近敌数抬高 priority
 * ——被围住时一次泼到一圈最值。目标还没中毒时略优先（毒会持续掉血）。够不到交给共享接近逻辑。
 */
namespace PokemonSkills {
    function sludgewaveWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) <= CompanionBehavior.ai<number>(item, "maxChase", 8);
    }

    /** 本次泥幕范围（真实半径 + 真实高度带 + 无实墙）内的敌人数；围住自己的越多，一次泼开越值。 */
    function sludgewaveRing(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        var self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[],
            world = CompanionBehavior.world(context), count = 0;
        var scope: PokemonSkills.FactContext = { world: world, actor: world.source(), skill: skills["sludgewave"],
            detail: { values: capability.data.config } };
        var radius = Math.max(2.2, p("sludgewave", "waveRadius", scope));
        var height = Math.max(0.8, p("sludgewave", "curtainHeight", scope));
        var half = self.height ? self.height / 2 : 0.7;
        var base = self.point[1] - half, span = half + height;
        var centre = CompanionBehavior.point(self.point);
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.friendly || other.health <= 0) continue;
            var dx = other.point[0] - self.point[0], dz = other.point[2] - self.point[2];
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            var targetHalf = other.height ? other.height / 2 : 0.7;
            if (other.point[1] + targetHalf < base - 0.5 || other.point[1] - targetHalf > base + span) continue;
            if (!world.clear(centre, CompanionBehavior.point(other.point))) continue;
            count++;
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
            // 剧毒与中毒同属已有毒，已带毒的目标不再给这份加价。
            if (!CompanionBehavior.status(context, target, "poison") && !CompanionBehavior.status(context, target, "toxic")) base += 8;
            if (!CompanionBehavior.ai<boolean>(capability, "cluster", true)) return base;
            return sludgewaveRing(context, capability) >= 2 ? base + 16 : base;
        }
    });

    addPreferences("sludgewave", {}, [
        field(pathOf("surge"), "广泼式", "boolean", {
            help: "开启：污泥泼得更广、泥幕更高、把人推得更动，但单次威力约少 24%%，适合被一群近敌围住时一次泼到。关闭：一发更厚更重、半径最窄的厚泥拍击。"
        }),
        field(pathOf("ai.maxChase"), "接近距离", "number", {
            min: 2, max: 16, step: 1,
            help: "超过这个距离就不主动泼泥，先朝目标走近。越大越愿意先接近再泼。"
        }),
        field(pathOf("ai.cluster"), "成片时优先", "boolean", {
            help: "开启后，自身体周本次射程内围着 2 个以上敌人时优先泼泥，一次泡到近身一圈；关闭则只按普通攻击排序。"
        })
    ]);
}
