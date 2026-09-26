/** Belch supplies a real consumption receipt; Recycle restores exactly that one item. Include belch as a smoke dependency. */
Smoke.scenario("recycle", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone"); stage.time("day"); stage.weather("clear");
    const caster = stage.pokemon({ species: "swalot", level: 30, moves: ["belch", "recycle"], item: "cobblemon:oran_berry", at: [-2, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] }); stage.noai(foe); stage.hostile(caster, foe);
    stage.until(900, () => stage.casts("belch", caster) > 0 && stage.casts("recycle", caster) > 0, () => {
        stage.expect(stage.heldItem(caster) === "cobblemon:oran_berry", "the consumed berry was restored into the real held slot");
        stage.expect(stage.pp(caster, "recycle") !== null, "the original recycle slot retains resource ownership");
        stage.note("confirmed consumption and recovery", { eaten: stage.casts("belch", caster), recycled: stage.casts("recycle", caster), held: stage.heldItem(caster) });
        stage.done();
    }, "consume then recycle one berry");
});
