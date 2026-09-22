/** Temporary playtest bindings; P5 authors the actual named skills. */
namespace NativeMechanismExamples {
    var fieldRadius = 3;
    function bind(move: string, name: string, kind: "point" | "friend", execute: (action: CombatAction) => void, preview: {} = {}): void {
        NativeLoadout.define(move, "examples:native_" + name, "p4.5", 40, kind, 16, function (action) {
            action.stage("preparing");
            action.after(6, function (ready) { ready.commit(60); execute(ready); ready.finish(); });
        });
        WorldCombat.preview("examples:native_" + name, JSON.stringify(preview));
    }
    if (typeof CobblemonCombat !== "undefined") {
        bind("growl", "snare", "point", function (action) { WorldEffects.field(action.world(), "world_combat:snare", action.targetPosition(), fieldRadius, {}, 100); }, { radius: fieldRadius });
        bind("leechseed", "spring", "point", function (action) { WorldEffects.field(action.world(), "world_combat:spring", action.targetPosition(), fieldRadius, {}, 120); }, { radius: fieldRadius });
        bind("tailwhip", "decoy", "point", function (action) {
            action.effect("world_combat:decoy", action.actor(), JSON.stringify({ point: WorldAI.coordinates(action.targetPosition()), health: 12 }), 160);
        });
        bind("withdraw", "reflect", "friend", function (action) { WorldEffects.apply(action.world(), action.target()!, "reflect", {}, 40); });
        WorldAI.provider("examples:native_area", function (facts, slot) {
            var skill = facts.skills[slot], target = facts.threat;
            if (skill.id !== "examples:native_snare" || target === null || target.position().minus(facts.origin).length() > skill.range) return null;
            return { slot: slot, score: 100, cost: 1, risk: 2, outcome: "Restrict the observed threat", target: null,
                point: target.position(), direction: WorldAI.direction(facts.origin, target.position()) };
        });
    }
}
