// Default native rewards translated for world defeat events; reference: Cobblemon 1.8.0
// StandardExperienceCalculator / Generation8EvCalculator (MPL-2.0).
namespace NativeGrowthDefaults {
    export function experience(event: CombatGrowthEvent, recipient: CombatGrowthRecipient, defeated: CombatPokemon, participation: number): number {
        var pokemon = recipient.pokemon();
        var scaled = defeated.baseExperience() * defeated.level() / 5 * participation;
        scaled *= Math.pow((2 * defeated.level() + 10) / (defeated.level() + pokemon.level() + 10), 2.5);
        var bonus = String(pokemon.originalTrainer()) === String(pokemon.owner()) ? 1 : 1.5;
        bonus *= NativeItems.applyFacts(pokemon, NativeEffects.empty(), "experience", { multiplier: 1, event: event }).multiplier;
        if (recipient.readyLevelEvolution()) bonus *= 1.2;
        if (pokemon.friendship() >= 220) bonus *= 1.2;
        return Math.max(0, Math.round((scaled + 1) * bonus * event.config("experienceMultiplier")));
    }
    export function handle(context: NativeGrowth.Context): void {
        var event = context.event;
        if (String(event.kind()) === "move-used") { context.records.push({ id: "use_move", amount: 1 }); return; }
        if (String(event.kind()) === "damage") {
            if (event.actor().health() > 0) context.records.push({ id: "damage_taken", amount: event.amount() });
            return;
        }
        var target = event.target();
        if (target === null || !target.wild() || String(event.actor().owner()) === "") return;
        context.records.push({ id: "defeat", amount: 1 });
        for (var i = 0; i < event.recipientCount(); i++) {
            var allocation = context.recipients[i], recipient = allocation.native, pokemon = recipient.pokemon();
            if (pokemon.health() <= 0 && event.config("awardExperienceToFaintedPokemon") === 0) continue;
            var participation = recipient.participated() ? 1 :
                NativeItems.applyFacts(pokemon, NativeEffects.empty(), "participation", { value: 0, event: event }).value;
            if (participation <= 0) continue;
            allocation.experience = experience(event, recipient, target, participation);
            for (var stat of ["hp", "atk", "def", "spa", "spd", "spe"]) {
                var amount = NativeItems.applyFacts(pokemon, NativeEffects.empty(), "ev", { stat: stat, amount: target.evYield(stat), event: event }).amount;
                if (amount > 0) allocation.ev[stat] = amount;
            }
        }
    }
}
NativeGrowth.rules.define({ id: "world_combat:native_growth", apply: NativeGrowthDefaults.handle });
