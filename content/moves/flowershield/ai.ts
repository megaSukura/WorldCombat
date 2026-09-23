/** 花瓣资格与执行共用：草属性宝可梦和手持花的活体都计入人数，伙伴同时考虑敌我受益。 */
namespace CompanionBehavior {
    const flowershieldChase = PokemonSkills.number("ai.maxChase", "开打距离", 4, 24, 1);
    flowershieldChase.help = "威胁进入这个距离内才考虑推花浪；越大越早开始。";
    const flowershieldPack = PokemonSkills.number("ai.pack", "花浪范围", 2, 10, 1);
    flowershieldPack.help = "把这招眼里的一圈算多大；越大越愿意为稍远的草属性伙伴推花浪。";

    PokemonSkills.addPreferences(PokemonSkills.flowershieldId, {}, [flowershieldChase, flowershieldPack]);

    registerFact("world_combat:flowershield_recipient", function (world, actor) { return PokemonSkills.flowershieldQualifies(world, actor); });
    function flowershieldIsGrass(context: WorldBehavior.Context, target: Entity): boolean {
        return !!fact<boolean>(context, "world_combat:flowershield_recipient", target);
    }
    function flowershieldCounts(context: WorldBehavior.Context, item: WorldBehavior.Capability): { friends: number; foes: number } {
        const self = source(context), pack = ai<number>(item, "pack", 6);
        let friends = 0, foes = 0;
        const examine = function (other: Entity): void {
            if (String(other.ref) !== String(self.ref) && distance(other.point, self.point) > pack) return;
            if (!flowershieldIsGrass(context, other)) return;
            if (status(context, other, PokemonSkills.flowershieldStatus)) return;
            if (String(other.ref) === String(self.ref) || other.friendly) friends++;
            else foes++;
        };
        examine(self);
        const nearby = context.facts.nearby as Entity[];
        for (let i = 0; i < nearby.length; i++) examine(nearby[i]);
        return { friends: friends, foes: foes };
    }

    registerUse(PokemonSkills.flowershieldId, {
        protocols: ["world_combat:fortify"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, _target) {
            if (context.facts.mounted) return false;
            const counts = flowershieldCounts(context, item);
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            if (distance(source(context).point, threat.point) > ai<number>(item, "maxChase", 12)) return false;
            return counts.friends > 0;
        },
        accepts: function () { return true; },
        priority: function (context, item, _target) {
            const counts = flowershieldCounts(context, item);
            if (counts.friends === 0) return 0;
            return counts.friends > counts.foes ? 86 : 66;
        }
    });
}
