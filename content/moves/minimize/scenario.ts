/** Native scale really changes, then the carrier can be cleared without retaining its owned contribution. */
Smoke.scenario("minimize", stage => {
    stage.fill([-10, -1, -10], [12, -1, 10], "minecraft:stone"); stage.time("day");
    const caster = stage.pokemon({ species: "pikachu", level: 40, moves: ["minimize"], at: [-3, 0, 0] });
    const foe = stage.mob({ type: "minecraft:ravager", at: [8, 0, 0] });
    const original = stage.attribute(caster, "minecraft:generic.scale");
    stage.hostile(caster, foe);
    stage.until(600, () => stage.hasMobEffect(caster, "world_combat:status/minimize") && stage.attribute(caster, "minecraft:generic.scale") < original, () => {
        stage.expect(stage.casts("minimize", caster) > 0, "Minimize committed and changed the native scale");
        const reduced = stage.attribute(caster, "minecraft:generic.scale");
        stage.command("effect clear " + caster.ref.split("/")[0] + " world_combat:minimize_small");
        stage.until(30, () => Math.abs(stage.attribute(caster, "minecraft:generic.scale") - original) < 0.0001, () => {
            stage.expect(!stage.hasMobEffect(caster, "world_combat:status/minimize"), "Clearing the carrier restores the owned scale in open space");
            stage.note("Open-space native size restoration; the shared neutral fixture also covers a sealed pocket waiting state", { before: original, reduced: reduced, after: stage.attribute(caster, "minecraft:generic.scale") });
            stage.done();
        }, "Native body restoration");
    }, "Native shrink window");
});
