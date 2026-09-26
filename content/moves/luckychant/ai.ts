/** Prioritize unprotected nearby recipients using the actual grant radius. Each blessing remains portable. */
namespace PokemonSkills {
    function luckychantAllyExposed(context: WorldBehavior.Context, capability: WorldBehavior.Capability): boolean {
        const self = CompanionBehavior.source(context), nearby = context.facts.nearby as CompanionBehavior.Entity[];
        const world = CompanionBehavior.world(context);
        const radius = p(luckychantId, "chantRadius", { world, actor: world.source(), detail: { values: capability.data.config } });
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (!other.friendly || other.health <= 0) continue;
            if (other.ref === self.ref || CompanionBehavior.distance(other.point, self.point) > radius) continue;
            if (!CompanionBehavior.status(context, other, luckychantStatus)) return true;
        }
        return false;
    }

    CompanionBehavior.registerUse(luckychantId, {
        protocols: ["world_combat:fortify"],
        reach: function () { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.status(context, self, luckychantStatus) && !luckychantAllyExposed(context, capability)) return false;
            const threat: CompanionBehavior.Entity | null = context.senses["world_combat:threat"];
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (CompanionBehavior.distance(self.point, threat.point) > CompanionBehavior.ai<number>(capability, "maxChase", 15)) return false;
            if (CompanionBehavior.ai<string>(capability, "opening", "anytime") !== "incoming") return true;
            const owner = context.facts.owner;
            return self.hurtAgo < 60 || threat.attacking === self.ref || !!owner && threat.attacking === owner.ref;
        },
        accepts: function (context, _capability, target) { return target.ref === CompanionBehavior.source(context).ref; },
        approachTarget: function (context) { return CompanionBehavior.source(context); },
        priority: function (context, capability) { return luckychantAllyExposed(context, capability) ? 56 : 50; }
    });

    addPreferences(luckychantId, { ai: { maxChase: 15, opening: "anytime", leaveStation: false } }, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 4, max: 28, step: 1,
            help: "威胁进入这个距离内才考虑起唱；调小只在贴身时唱，调大在更远处就先准备好。" }),
        choice("ai.opening", "出手时机", ["anytime", "incoming"], ["随时", "受压时起唱"]),
        flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
