/**
 * Conversion AI use.
 *
 * The lead move's type is fixed by the moveset, so the decision is whether that type is worth wearing now. It is
 * compared against a known attacker: the reweave is offered when the body would take less from that type, or when
 * one of the body's own damaging moves gains the same-type bonus. The threat's attack type is the real, finite
 * native attack memory (`DamageSemantics.recentAttack` elementType) — an actual attack that already landed, not a
 * guess from the species. An attack with no readable element type never invents an advantage, so only the
 * own-output gain applies. "Current types" is read through the shared combatant facts so every live temporary
 * layer counts, matching the server's ready check. Offered through the shared `world_combat:fortify` goal.
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
    /** The attacker's real recent native attack element; "" when no readable attack has landed in the window. */
    CompanionBehavior.registerFact("world_combat:conversion-threat", function (access, actor, _argument) {
        if (!access.valid(actor)) return "";
        var recent = DamageSemantics.recentAttack(access, actor, 200);
        return recent && typeof recent.elementType === "string" ? String(recent.elementType) : "";
    });
    /** Current effective types, including every live shared temporary layer; matches the server's ready check. */
    function conversionOwnTypes(world: CombatWorld, actor: CombatActor): string[] {
        if (!world.valid(actor)) return [];
        return PokemonDamage.combatants.read(world, actor).types;
    }

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
        var lead = fact<string>(context, "world_combat:conversion-lead", self) || "";
        if (!actor || !lead) return result;
        var own = conversionOwnTypes(scope, actor);
        if (!own.length) return result;
        result.stab = conversionStab(scope, actor, lead);
        var threat = context.senses["world_combat:threat"];
        if (!threat) return result;
        var attack = fact<string>(context, "world_combat:conversion-threat", threat) || "";
        if (!conversionKnown(attack)) return result;
        result.known = true;
        result.defence = CobblemonCombat.typeEffectiveness(attack, lead) < conversionDefence(attack, own);
        return result;
    }

    registerUse("conversion", {
        protocols: ["world_combat:fortify"],
        available: function (context) {
            if (context.facts.mounted) return false;
            var self = source(context), scope = world(context), actor = scope.actor(self.ref);
            if (!actor) return false;
            var own = conversionOwnTypes(scope, actor);
            if (!own.length) return false;
            var lead = fact<string>(context, "world_combat:conversion-lead", self);
            if (!lead) return false;
            // 已经完全就是那一个单一属性时才不出；双属性含首系仍可收成单型，与执行预检一致。
            if (own.length === 1 && own[0] === lead) return false;
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
