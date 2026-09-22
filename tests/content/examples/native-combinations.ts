/** Capability fixtures for P4. P5 supplies the formal designs and their native names. */
namespace NativeCombinationExamples {
    function register(move: string, name: string, kind: "enemy" | "friend" | "aim", execute: (action: CombatAction) => void): void {
        NativeLoadout.define(move, "examples:" + name, "p4.5", 100, kind, 12, function (action) {
            action.stage("preparing"); action.after(8, function (ready) { ready.commit(60); execute(ready); ready.finish(); });
        });
    }
    if (typeof CobblemonCombat !== "undefined") {
        register("disable", "move_seal", "enemy", function (action) {
            var target = action.target()!, state = NativeEffects.read(action.world(), target), first = CobblemonCombat.pokemon(target).move(0);
            var move = state.used || (first ? first.id() : "");
            if (move) NativeModifiers.apply(action.world(), target, { forbidden: [move] }, 100);
        });
        register("skillswap", "ability_exchange", "enemy", function (action) {
            var world = action.world(), target = action.target()!, own = CobblemonCombat.pokemon(action.actor()), other = CobblemonCombat.pokemon(target);
            var a = NativeEffects.ability(own, NativeEffects.read(world, action.actor())), b = NativeEffects.ability(other, NativeEffects.read(world, target));
            if (a && b) { NativeModifiers.apply(world, action.actor(), { ability: b }, 160); NativeModifiers.apply(world, target, { ability: a }, 160); }
        });
        register("transform", "combat_copy", "enemy", function (action) { NativeModifiers.copy(action.world(), action.actor(), action.target()!, 160); });
        register("trick", "held_exchange", "enemy", function (action) { if (!NativeModifiers.exchange(action.world(), action.target()!)) action.reject("resource-changed"); });
        NativeLoadout.define("copycat", "examples:borrowed_action", "p4.5", 120, "aim", 18, function (action) {
            var target = action.target(), state = target === null ? null : NativeEffects.read(action.sense(), target);
            if (!state || !state.used) { action.reject("no-observed-move"); return; }
            NativeLoadout.call(action, state.used);
        });
        NativeLoadout.define("metronome", "examples:random_action", "p4.5", 120, "aim", 18, function (action) {
            var choice = NativeLoadout.choose(action, ["ember", "watergun"]);
            if (choice === null) action.reject("move-unavailable"); else NativeLoadout.call(action, choice);
        });
        WorldAI.provider("examples:move_seal", function (facts, slot) {
            var skill = facts.skills[slot], target = facts.threat;
            if (skill.id !== "examples:move_seal" || !target || target.actor().domain() !== "cobblemon" || target.position().minus(facts.origin).length() > skill.range) return null;
            return { slot: slot, score: 65, cost: 8, risk: 2, outcome: "Temporarily restrict the observed threat's move", target: target.actor(), point: target.position(), direction: WorldAI.direction(facts.origin, target.position()) };
        });
    }
}
