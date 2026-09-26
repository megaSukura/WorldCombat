/** Commit the local oath only with a threat close enough to fight from the fixed circle. */
namespace CompanionBehavior {
    registerFact("world_combat:noretreat/radius", function (access, actor, config) { return PokemonSkills.p("noretreat", "ring",
        { pokemon: CobblemonCombat.pokemon(actor), world: access, actor, skill: PokemonSkills.skills["noretreat"], detail: { values: config } }); });
    function noRetreatWants(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        if (context.facts.mounted) return false;
        const self = source(context), threat = context.senses["world_combat:threat"];
        if (status(context, self, "noretreat")) return false;
        if (ratio(self) < ai<number>(item, "healthFloor", 0.35)) return false;
        if (!threat) return false;
        return distance(self.point, threat.point) <= Math.min(ai<number>(item, "maxChase", 12), (fact<number>(context, "world_combat:noretreat/radius", self, item.data.config) || 2.4) + 1.5);
    }

    registerUse("noretreat", {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, item, _purpose, _target) { return noRetreatWants(context, item); },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); },
        approachTarget: function (context) { return source(context); },
        priority: function (context, item, _target) { return noRetreatWants(context, item) ? 26 : 0; }
    });

    PokemonSkills.addPreferences("noretreat", { ai: { healthFloor: 0.35 } }, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑立誓；越大越早顶满、也越可能在没贴上时先把自己限制在阵界内。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.healthFloor"), "生命下限", "number", {
            min: 0, max: 0.9, step: 0.05,
            help: "自身生命比例低于此值就不立誓；调 0 表示残血也照立，调高只在满血附近才敢把自己限制在阵界内。"
        })
    ]);
}
