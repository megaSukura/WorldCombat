/** Disposable protocol examples. Their rules and schema migrations live entirely in this package. */
namespace EffectExamples {
    function memory(json: string): string {
        var value = JSON.parse(json);
        if (typeof value.pulses !== "number" || !isFinite(value.pulses) || value.pulses < 0 || value.pulses % 1 !== 0)
            throw new Error("Memory pulses must be a nonnegative integer");
        return JSON.stringify({ pulses: value.pulses });
    }
    export function install(): void {
        WorldCombat.effect("examples:memory", 2, 12000, "persistent", memory, function (version, json) {
            if (version !== 1) throw new Error("Unsupported example memory schema " + version);
            return memory(JSON.stringify({ pulses: JSON.parse(json).count }));
        });
        WorldCombat.effectHandler("examples:memory", "start", function (effect) {
            effect.schedule("pulse", "pulse", 5, "{}");
            effect.listen("world_combat:impact", "world_combat:after", "observed");
        });
        WorldCombat.effectHandler("examples:memory", "pulse", function (effect) {
            var value = JSON.parse(effect.state());
            value.pulses++;
            effect.state(JSON.stringify(value));
            effect.schedule("pulse", "pulse", 5, "{}");
        });
        WorldCombat.effectHandler("examples:memory", "observed", function (effect) {
            if (effect.event().target().key() !== effect.target().key()) return;
            var value = JSON.parse(effect.state()); value.pulses++;
            effect.state(JSON.stringify(value));
        });
        WorldCombat.effectHandler("examples:memory", "operation:world_combat:extend", function (effect) {
            if (effect.caller().key() !== effect.source().key()) effect.reject("effect-not-owned");
            var ticks = JSON.parse(effect.input()).ticks;
            if (typeof ticks !== "number" || ticks % 1 !== 0 || ticks < 1) throw new Error("Invalid extension");
            effect.remaining(Math.min(12000, effect.remaining() + ticks));
        });
        WorldCombat.effectHandler("examples:memory", "operation:world_combat:dispel", function (effect) {
            if (effect.caller().key() !== effect.source().key()) effect.reject("effect-not-owned");
            effect.end();
        });
        function empty(json: string): string { return "{}"; }
        WorldCombat.effect("examples:half", 1, 100, "actor", empty, EffectProtocols.unchanged);
        WorldCombat.effectHandler("examples:half", "start", function (effect) {
            effect.listen("world_combat:impact", "world_combat:intercept", "intercept");
        });
        WorldCombat.effectHandler("examples:half", "intercept", function (effect) {
            var event = effect.event();
            if (event.target().key() !== effect.target().key()) return;
            var value = JSON.parse(event.payload()); value.amount *= 0.5; event.payload(JSON.stringify(value));
        });
        WorldCombat.effect("examples:add", 1, 100, "action", empty, EffectProtocols.unchanged);
        WorldCombat.effectHandler("examples:add", "start", function (effect) {
            effect.listen("world_combat:impact", "world_combat:modify", "modify");
        });
        WorldCombat.effectHandler("examples:add", "modify", function (effect) {
            var event = effect.event();
            if (event.target().key() !== effect.target().key()) return;
            var value = JSON.parse(event.payload()); value.amount += 2; event.payload(JSON.stringify(value));
        });
        WorldCombat.registerAction("examples:protocol_hit", "p4.2", 20, "enemy", 4, function (action) {
            var target = action.target(); if (target === null) return;
            action.commit(10);
            // Register in reverse execution order to exercise the declared phase dependencies.
            action.effect("examples:add", target, "{}", 30);
            action.effect("examples:half", target, "{}", 30);
            var result = JSON.parse(action.signal("world_combat:impact", 1, target, '{"amount":6}'));
            action.damage(action.trace(action.origin(), action.targetPosition(), 0), result.amount);
            action.finish();
        });
        WorldCombat.registerAction("examples:remember", "p4.2", 20, "friend", 4, function (action) {
            action.commit(10);
            action.effect("examples:memory", action.actor(), '{"pulses":0}', 12000);
            action.finish();
        });
    }
}
EffectExamples.install();
