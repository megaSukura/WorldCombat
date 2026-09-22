/**
 * Test fixture: server-side triggers for the particle engine. A normal hit publishes the one-shot
 * impact at the struck actor; any Cobblemon actor renews the continuous aura every 20 ticks.
 */
namespace ParticleSample {
    function pointOf(world: CombatWorld, actor: CombatActor): CombatPoint | null {
        var body = world.observe(actor);
        return body === null ? null : body.position();
    }

    WorldCombat.on("checks:particle_sample/hit", "world_combat:damage_applied", "", function (event) {
        var target = event.target();
        if (target === null) return;
        var point = pointOf(event.world(), target);
        if (point === null) return;
        WorldFeedback.emit(event.world(), "checks:particle_sample", 1, point,
            { moment: "impact", target: String(target.ref()) }, 40);
    });

    WorldCombat.on("checks:particle_sample/aura", "world_combat:actor_tick", "", function (event) {
        var world = event.world(), actor = event.actor();
        if (String(actor.domain()) !== "cobblemon") return;
        if (world.tick() % 20 !== 0) return;
        var point = pointOf(world, actor);
        if (point === null) return;
        WorldFeedback.keep(world, "aura", "checks:particle_sample", 1, point, { moment: "main" }, 40);
    });
}
