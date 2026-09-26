/**
 * Conversion AI use.
 *
 * The lead move's type is fixed by the moveset, so the decision is whether that type is worth wearing now. It is
 * compared against a known attacker: the reweave is offered when the body would take less from that type, or when
 * one of the body's own damaging moves gains the same-type bonus. An unknown mod attack has no readable Cobblemon
 * type, so it never invents an advantage and only the own-output gain applies. Offered through the shared
 * `world_combat:fortify` goal; the lead type is read through a decision-scoped probe.
 */
namespace CompanionBehavior {
    function conversionLeadType(world: CombatWorld, actor: CombatActor): string {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return "";
        var pokemon = CobblemonCombat.pokemon(actor), lead = pokemon.move(0);
        return lead ? String(lead.type()) : "";
    }
    CompanionBehavior.registerFact("world_combat:conversion-lead", function (access, actor, _argument) {
        return conversionLeadType(access, actor);
    });
    /** Last attack type read back from a native individual; "" when it is unknown or not a Pokemon. */
    CompanionBehavior.registerFact("world_combat:conversion-threat", function (access, actor, _argument) {
        if (String(actor.domain()) !== "cobblemon") return "";
        var state = NativeEffects.read(access, actor);
        if (!state.used) return "";
        var move = CobblemonCombat.moveTemplate(state.used);
        return move ? String(move.type()) : "";
    });

    var conversionTypeIds = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
        "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
    function conversionKnown(type: string): boolean { return conversionTypeIds.indexOf(type) >= 0; }
    /** The lead type already matches a damaging move the body knows, so the reweave grants that move STAB. */
    function conversionStab(world: CombatWorld, actor: CombatActor, type: string): boolean {
        if (String(actor.domain()) !== "cobblemon") return false;
        var pokemon = CobblemonCombat.pokemon(actor);
        for (var slot = 0; slot < pokemon.moveSlots(); slot++) {
            var move = pokemon.move(slot);
            if (!move || String(move.category()) === "status") continue;
            if (String(move.type()) === type) return true;
        }
        return false;
    }
    function conversionDefence(attackType: string, types: string[]): number {
        var factor = 1;
        for (var index = 0; index < types.length; index++) factor *= CobblemonCombat.typeEffectiveness(attackType, types[index]);
        return factor;
    }
    interface ConversionPlan { defence: boolean; stab: boolean; known: boolean; }
    function conversionPlan(context: WorldBehavior.Context): ConversionPlan {
        var self = source(context), scope = world(context), actor = scope.actor(self.ref);
        var result: ConversionPlan = { defence: false, stab: false, known: false };
        var facts = pokemonFacts(context, self), lead = fact<string>(context, "world_combat:conversion-lead", self) || "";
        if (!actor || !facts || !facts.types.length || !lead) return result;
        result.stab = conversionStab(scope, actor, lead);
        var threat = context.senses["world_combat:threat"];
        if (!threat) return result;
        var attack = fact<string>(context, "world_combat:conversion-threat", threat) || "";
        if (!conversionKnown(attack)) return result;
        result.known = true;
        result.defence = CobblemonCombat.typeEffectiveness(attack, lead) < conversionDefence(attack, facts.types);
        return result;
    }

    registerUse("conversion", {
        protocols: ["world_combat:fortify"],
        available: function (context) {
            if (context.facts.mounted) return false;
            var self = source(context), facts = pokemonFacts(context, self);
            if (!facts || !facts.types.length) return false;
            var lead = fact<string>(context, "world_combat:conversion-lead", self);
            if (!lead || facts.types.indexOf(lead) >= 0) return false;
            var plan = conversionPlan(context);
            return plan.defence || plan.stab;
        },
        priority: function (context) {
            var plan = conversionPlan(context);
            if (plan.defence) return 30;
            if (plan.stab) return plan.known ? 16 : 12;
            return 6;
        }
    });
}
