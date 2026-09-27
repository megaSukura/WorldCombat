/** 花瓣资格与执行共用：草属性宝可梦和手持花的活体都计入人数，伙伴同时考虑敌我受益。 */
namespace CompanionBehavior {
    const flowershieldChase = PokemonSkills.number("ai.maxChase", "开打距离", 4, 24, 1);
    flowershieldChase.help = "威胁进入这个距离内才考虑推花浪；越大越早开始。";

    PokemonSkills.addPreferences(PokemonSkills.flowershieldId, {}, [flowershieldChase]);

    registerFact("world_combat:flowershield_recipient", function (world, actor) { return PokemonSkills.flowershieldQualifies(world, actor); });
    function flowershieldIsGrass(context: WorldBehavior.Context, target: Entity): boolean {
        return !!fact<boolean>(context, "world_combat:flowershield_recipient", target);
    }
    /** 本招这一圈的真实半径：直接读 bloom 公式，与判定、指示圈同源，不再用固定 pack 估。 */
    function flowershieldRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        try {
            return Math.max(2.2, PokemonSkills.p(PokemonSkills.flowershieldId, "bloom", {
                world: world(context), actor: world(context).source(),
                skill: PokemonSkills.skills[PokemonSkills.flowershieldId], detail: { values: item.data.config }
            }));
        } catch (error) { return 3.0; }
    }
    function flowershieldCounts(context: WorldBehavior.Context, item: WorldBehavior.Capability): { friends: number; foes: number } {
        const self = source(context), radius = flowershieldRadius(context, item);
        let friends = 0, foes = 0;
        const examine = function (other: Entity): void {
            if (String(other.ref) !== String(self.ref) && distance(other.point, self.point) > radius) return;
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
            // 按净友方收益排序：护住的友方减去顺带护到的敌人；敌人更多时分数随净收益下调，不再固定 66。
            const net = counts.friends - counts.foes;
            return Math.max(5, Math.min(95, Math.round(50 + net * 8)));
        }
    });
}
