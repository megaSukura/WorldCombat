/**
 * 气象球 / weatherball —— AI 用途。
 *
 * 出手局面：目标是可见敌对的活体、且在 `ai.maxChase`（默认 16）格内时，作为远程攻击出手。
 * priority 由当前天色定属性后按实际收益叠分：天色可收（下雨、雷雨或晴空强日照）先抬到 55，
 * 再看这颗球的属性对目标实际相性（克制加分、免疫减分）；开了贯穿且投掷线后还有敌人排成一列时再加分，
 * 让“打出一条线”比只打在第一个身上更值。配置：多远考虑出手、驻守指令下是否离位。
 */
namespace CompanionBehavior {
    function weatherballCharged(context: WorldBehavior.Context): boolean {
        var access = CompanionBehavior.world(context);
        var point = CompanionBehavior.point(CompanionBehavior.source(context).point);
        return PokemonSkills.weatherballSkyAt(access, point) !== "clear";
    }

    /** 贯穿队列：投掷线远端、与首个目标同层的敌人数量；开了贯穿才有额外收益。 */
    function weatherballQueue(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        var self = CompanionBehavior.point(CompanionBehavior.source(context).point);
        var first = CompanionBehavior.point(target.point);
        var heading = WorldGeometry.flatUnit(first.minus(self));
        var near = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
        var span = typeof item.data.range === "number" && isFinite(item.data.range) ? item.data.range : near;
        var count = 0;
        var nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        for (var i = 0; i < nearby.length; i++) {
            var other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0) continue;
            var at = CompanionBehavior.point(other.point), delta = at.minus(self);
            var along = WorldGeometry.dot(delta, heading);
            if (along <= near || along > span + 2) continue;
            if (Math.abs(at.y() - self.y()) > 2.5) continue;
            var flat = WorldCombat.point(delta.x(), 0, delta.z());
            var perp = Math.sqrt(Math.max(0, flat.length() * flat.length() - along * along));
            if (perp <= 1.6) count++;
        }
        return count;
    }

    registerUse("weatherball", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context: WorldBehavior.Context, item: WorldBehavior.Capability): number { return item.data.range; },
        available: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, purpose: string, target: WorldMethods.Subject | null): boolean {
            if (!target) return true;
            return distance(source(context).point, target.point) <= ai(item, "maxChase", 16);
        },
        accepts: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject): boolean {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context: WorldBehavior.Context, item: WorldBehavior.Capability, target: WorldMethods.Subject | null): number {
            if (!target) return 0;
            var type = PokemonSkills.weatherballElementOf(PokemonSkills.weatherballSkyAt(
                CompanionBehavior.world(context), CompanionBehavior.point(CompanionBehavior.source(context).point))).type;
            var factor = 1;
            var facts = CompanionBehavior.pokemonFacts(context, target);
            if (facts && facts.types) for (var i = 0; i < facts.types.length; i++) factor *= CobblemonCombat.typeEffectiveness(type, facts.types[i]);
            var base = weatherballCharged(context) ? 55 : 25;
            var adjust = factor > 1 ? 12 : factor === 0 ? -25 : 0;
            var pierce = !!(item.data.config && item.data.config.pierce);
            var queue = pierce ? weatherballQueue(context, item, target) : 0;
            return base + adjust + (queue >= 2 ? 10 : queue >= 1 ? 5 : 0);
        }
    });

    PokemonSkills.addPreferences("weatherball", { ai: { maxChase: 16, leaveStation: true } }, [
        PokemonSkills.number("ai.maxChase", "投掷距离", 4, 24, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);
}
