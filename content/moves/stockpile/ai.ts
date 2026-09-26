/** Store toward the chosen reserve; full stores are spent only when the small release helps. */
namespace PokemonSkills {
    CompanionBehavior.registerFact("world_combat:move_stockpile/layers", function (access, actor, _argument) {
        return stockpileLayers(access, actor);
    });

    CompanionBehavior.registerFact("world_combat:move_stockpile/consumers", function (access, actor) {
        return { swallow: NativeLoadout.hasEquipped(access, actor, "swallow"), spitup: NativeLoadout.hasEquipped(access, actor, "spitup") };
    });
    function stockpileReleaseUseful(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
        const consumers = CompanionBehavior.fact<any>(context, "world_combat:move_stockpile/consumers", self) || {};
        const ratio = CompanionBehavior.ratio(self);
        if (consumers.swallow && ratio < 0.7 || consumers.spitup && ratio >= 0.7) return false;
        return item.data.config.break === "burst"
            ? !!threat && CompanionBehavior.distance(self.point, threat.point) <= 3 && threat.visible
            : ratio < 0.9;
    }

    CompanionBehavior.registerUse("stockpile", {
        protocols: ["world_combat:fortify"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context), threat = context.senses["world_combat:threat"];
            if ((CompanionBehavior.fact<number>(context, "world_combat:move_stockpile/layers", self) || 0) >= stockpileMaxLayers) return stockpileReleaseUseful(context, capability);
            if (!threat) return false;
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return false;
            return CompanionBehavior.distance(self.point, threat.point) <= CompanionBehavior.ai<number>(capability, "maxChase", 12);
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability, _target) {
            const threat = context.senses["world_combat:threat"];
            const self = CompanionBehavior.source(context);
            if ((CompanionBehavior.fact<number>(context, "world_combat:move_stockpile/layers", self) || 0) >= stockpileMaxLayers) return stockpileReleaseUseful(context, capability) ? 85 : 0;
            if (!threat) return 0;
            if (CompanionBehavior.distance(self.point, threat.point) < CompanionBehavior.ai<number>(capability, "minGap", 2)) return 0;
            const layers = CompanionBehavior.fact<number>(context, "world_combat:move_stockpile/layers", self) || 0;
            if (layers < CompanionBehavior.ai<number>(capability, "hoardTo", 2)) return 106;
            return 40;
        }
    });

    addPreferences("stockpile", {}, [
        field(pathOf("ai.maxChase"), "蓄力距离", "number", {
            min: 2, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑继续蓄力；越大越早开始铺层，也越早把层数带进交战。"
        }),
        field(pathOf("ai.minGap"), "贴身下限", "number", {
            min: 0, max: 8, step: 1,
            help: "威胁近于这个距离时不再蓄力、直接交战；调大更常在近身时放弃补层。"
        }),
        field(pathOf("ai.hoardTo"), "蓄到几层", "number", {
            min: 1, max: 3, step: 1,
            help: "打算攒到几层再压上去；调高更贪、更晚接战，调低更早带着薄壳应战。"
        })
    ]);
}
