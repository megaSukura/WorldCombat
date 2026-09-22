// Scene setup and native assertions are in NativeCombinationChecks; these checks execute the shipped JS library.
NativeLoadout.define("assist", "checks:recursive_call", "test", 20, "aim", 12, function (action) { NativeLoadout.call(action, "assist"); });
WorldCombat.on("checks:combinations", "checks:combination_step", "", function (event) {
    var world = event.world(), actor = event.actor(), target = event.target(), input = JSON.parse(event.data()), result = {};
    if (input.step === "layers") {
        NativeModifiers.apply(world, actor, { stages: { atk: 2 }, ability: "waterabsorb", types: ["water"] }, 30);
        NativeModifiers.apply(world, actor, { stages: { atk: -1 }, ability: "flashfire" }, 10);
    } else if (input.step === "borrow") {
        NativeModifiers.apply(world, actor, { moves: { "0": "watergun" } }, 25);
    } else if (input.step === "stale") {
        NativeModifiers.apply(world, actor, { moves: { "0": "ember" } }, 2);
    } else if (input.step === "remember") {
        var remembered = NativeEffects.read(world, target); remembered.used = "watergun"; NativeEffects.write(world, target, remembered);
    } else if (input.step === "copy") NativeModifiers.copy(world, actor, target, 30);
    else if (input.step === "exchange") result.swapped = NativeModifiers.exchange(world, target);
    var pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
    result.ability = NativeEffects.ability(pokemon, state); result.stage = NativeEffects.stage(state, "atk"); result.used = state.used;
    result.attack = NativeEffects.stat(pokemon, state, "atk"); result.types = NativeEffects.types(pokemon, state);
    result.nativeAbility = pokemon.ability(); result.nativeSpecies = pokemon.species(); result.nativeAttack = pokemon.stat("atk");
    event.data(JSON.stringify(result));
});

// Minimal absorption abilities for these mechanism checks; shipped ability units live in content/abilities.
NativeAbilities.define("waterabsorb", {}, { incoming: function (context, data) {
    if (data.type !== "water") return;
    data.amount = 0;
    NativeEffects.heal(context.world, context.actor, context.pokemon, context.pokemon.maxHealth() * 0.25, "ability");
} });
NativeAbilities.define("flashfire", {}, { incoming: function (context, data) { if (data.type === "fire") data.amount = 0; } });
