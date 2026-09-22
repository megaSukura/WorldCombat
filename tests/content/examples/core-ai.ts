/** A core-only behaviour pack using the same perception and candidate interfaces as companions. */
namespace CoreExampleAI {
    WorldAI.provider("examples:core_beam", function (facts, slot) {
        var skill = facts.skills[slot], target = facts.threat;
        if (skill.id !== "examples:beam" || target === null || target.position().minus(facts.origin).length() > skill.range) return null;
        return { slot: slot, score: 50, target: target.actor(), point: target.position(), direction: WorldAI.direction(facts.origin, target.position()) };
    });
    WorldCombat.effect("examples:brain", 1, 1200000, "actor", function (json) { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
    WorldCombat.effectHandler("examples:brain", "start", function (effect) { effect.schedule("decide", "decide", 1, "{}"); });
    WorldCombat.effectHandler("examples:brain", "decide", function (effect) {
        var world = effect.world(), source = world.observe(effect.source())!, memory: any = JSON.parse(effect.state());
        world.controlled(true);
        if (!world.busy()) {
            var anchor = memory.home ? WorldAI.point(memory.home) : source.position(); memory.home = WorldAI.coordinates(anchor);
            var target = WorldAI.perceive(world, anchor, 16, memory, function (other) { return WorldAI.tagged(other, "wc_p4_target") ? 10 : -Infinity; });
            var heard = world.heard(memory.sound || 0, 16);
            if (heard.length) { var sound = heard[heard.length - 1]; memory.sound = sound.id(); memory.heard = WorldAI.coordinates(sound.position()); memory.heardAt = world.tick(); }
            var best = WorldAI.best({ origin: source.position(), ally: source, threat: target, health: source.health(), maximum: source.maxHealth(), conservative: false,
                skills: [{ id: "examples:beam", kind: "aim", range: 16, ready: world.cooldown("examples:beam") === 0 }] });
            if (best !== null) world.cast("examples:beam", best.target, best.point, best.direction, "{}");
            else WorldAI.navigate(world, memory.point ? WorldAI.point(memory.point) : memory.heard && world.tick() - memory.heardAt <= 60 ? WorldAI.point(memory.heard) : anchor, 2, memory);
        }
        effect.state(JSON.stringify(memory)); effect.remaining(1200000); effect.schedule("decide", "decide", 5, "{}");
    });
    WorldCombat.on("examples:brain_registration", "world_combat:actor_tick", "", function (event) {
        if (event.actor().domain() !== "minecraft") return;
        var world = event.world(), source = world.observe(event.actor())!;
        if (WorldAI.tagged(source, "wc_p4_brain") && !world.effects(event.actor(), "examples:brain").length) world.effect("examples:brain", event.actor(), "{}", 1200000);
    });
}
