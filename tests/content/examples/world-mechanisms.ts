/** P4 capability examples. P5 selects and designs named, native-loadout content separately. */
namespace MechanismExamples {
    export function install(): void {
        WorldCombat.registerAction("examples:beam", "p4.5", 80, "aim", 16, function (action) {
            action.stage("preparing");
            action.on("world_combat:interrupt", function (current) { current.cancel(); });
            action.after(8, function (ready) { ready.commit(60); WorldActions.beam(ready, 4, 5, 2); });
        });
        WorldCombat.registerAction("examples:seek", "p4.5", 80, "enemy", 20, function (action) { action.commit(50); WorldActions.seek(action, 0.6, 40); });
        WorldCombat.registerAction("examples:chain", "p4.5", 10, "enemy", 12, function (action) { action.commit(40); WorldActions.chain(action.world(), action.target()!, 2, 3); action.finish(); });
        ["mist", "snare", "spring", "vortex"].forEach(function (rule) {
            var radius = 3;
            WorldCombat.registerAction("examples:" + rule, "p4.5", 30, "point", 16, function (action) {
                action.stage("preparing"); action.after(6, function (ready) {
                    ready.commit(80); WorldEffects.field(ready.world(), "world_combat:" + rule, ready.targetPosition(), radius, {}, 120); ready.finish();
                });
            });
            WorldCombat.preview("examples:" + rule, JSON.stringify({ radius: radius }));
        });
        WorldCombat.registerAction("examples:decoy", "p4.5", 10, "point", 12, function (action) {
            action.commit(100); action.effect("world_combat:decoy", action.actor(), JSON.stringify({ point: WorldAI.coordinates(action.targetPosition()), health: 12 }), 160); action.finish();
        });
        WorldCombat.registerAction("examples:reflect", "p4.5", 10, "friend", 8, function (action) { action.commit(60); WorldEffects.apply(action.world(), action.target()!, "reflect", {}, 40); action.finish(); });
        WorldCombat.registerAction("examples:swap", "p4.5", 10, "friend", 12, function (action) {
            action.commit(50); if (!action.world().swap(action.actor(), action.target()!)) action.reject("space-occupied"); action.finish();
        });
        WorldCombat.registerAction("examples:pull", "p4.5", 30, "enemy", 8, function (action) {
            action.commit(50); var step = 0;
            function advance(current: CombatAction): void {
                var world = current.world(), target = current.target()!;
                if (!world.valid(target) || !world.visible(target)) { current.finish(); return; }
                var delta = current.origin().minus(current.targetPosition());
                if (delta.length() <= 2 || ++step > 8) { current.finish(); return; }
                world.displace(target, delta.unit().scale(0.4)); current.after(1, advance);
            }
            advance(action);
        });
        WorldAI.provider("examples:area_candidates", function (facts, slot) {
            var skill = facts.skills[slot], threat = facts.threat;
            if (!threat || threat.position().minus(facts.origin).length() > skill.range) return null;
            if (skill.id !== "examples:snare" && skill.id !== "examples:vortex") return null;
            // A zone offers control when a threat is closing; a distant placement has little immediate value.
            var distance = threat.position().minus(facts.ally.position()).length();
            if (distance > 8) return null;
            return { slot: slot, score: 90 - distance, cost: 10, risk: distance < 2 ? 10 : 0, outcome: "Restrict approach through the selected area",
                target: null, point: threat.position(), direction: WorldAI.direction(facts.origin, threat.position()) };
        });
    }
}
MechanismExamples.install();
