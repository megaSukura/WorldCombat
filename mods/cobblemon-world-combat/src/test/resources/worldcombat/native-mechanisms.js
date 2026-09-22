WorldAI.provider("checks:unhelpful_candidate", function (facts, slot) {
    if (facts.skills[slot].id !== "examples:native_snare" || facts.threat === null) return null;
    return { slot: slot, score: 200, cost: 1, risk: 150, outcome: "Leave the threat uncontrolled", target: null,
        point: facts.origin, direction: WorldCombat.point(0, 0, 1) };
});

// Minimal absorption abilities for these mechanism checks; shipped ability units live in content/abilities.
NativeAbilities.define("waterabsorb", {}, { incoming: function (context, data) {
    if (data.type !== "water") return;
    data.amount = 0;
    NativeEffects.heal(context.world, context.actor, context.pokemon, context.pokemon.maxHealth() * 0.25, "ability");
} });
NativeAbilities.define("flashfire", {}, { incoming: function (context, data) { if (data.type === "fire") data.amount = 0; } });

// Minimal held-item rules for the item settlement checks; shipped item units arrive with their own wave.
NativeItems.define("focus_sash", { incoming: function (context, data) {
    var pokemon = context.pokemon;
    if (pokemon.health() !== pokemon.maxHealth() || data.amount < pokemon.health() * pokemon.healthScale()) return;
    data.amount = Math.max(0, pokemon.health() - 1) * pokemon.healthScale();
    data.consumeTarget = pokemon.heldKey();
} });
var lifeOrbCharged = {};
NativeItems.define("life_orb", { applied: function (context, data) {
    // One charge per action: several hits of one action settle in the same tick, so the memory lives outside the persisted state.
    var ref = String(context.actor.ref());
    if (data.kind !== "move" || !(data.actual > 0) || lifeOrbCharged[ref] === data.action) return;
    lifeOrbCharged[ref] = data.action;
    NativeItems.loss(context, context.pokemon.maxHealth() / 10, "life_orb");
} });
NativeItems.define("pecha_berry", { pulse: function (context) {
    var pokemon = context.pokemon;
    if (String(pokemon.status()) !== "cobblemon:poison") return;
    if (CobblemonCombat.status(context.world, context.actor, "", 0, String(pokemon.statusKey()))) NativeItems.consume(context);
} });
