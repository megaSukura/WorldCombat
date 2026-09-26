/** Observe actual inline invocation and source resource payment. */
let naturepowerCalled = "", naturepowerDamageMove = "";
WorldCombat.on("world_combat:checks/naturepower_call", "world_combat:committed", "", event => {
    const action = event.action(); if (!action || action.content() !== "world_combat:naturepower") return;
    const move = NativeLoadout.executing(action); naturepowerCalled = move ? String(move.id()) : "";
});
WorldCombat.on("world_combat:checks/naturepower_hit", "world_combat:damage_applied", "", event => {
    if (event.world().originData("world_combat:naturepower/call") === null) return;
    naturepowerDamageMove = JSON.parse(event.data()).move || "";
});
Smoke.scenario("naturepower", stage => {
    naturepowerCalled = ""; naturepowerDamageMove = "";
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:grass_block"); stage.weather("clear"); stage.time("day");
    const caster = stage.pokemon({ species: "seedot", level: 30, moves: ["naturepower"], at: [-3, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] }); stage.noai(foe); stage.hostile(caster, foe);
    stage.until(800, () => naturepowerCalled !== "" && stage.damageTo(foe) > 0, () => {
        stage.expect(naturepowerCalled === "energyball", "real grass called the Energy Ball recipe");
        stage.expect(stage.casts("naturepower", caster) > 0, "the source Nature Power action committed");
        stage.expect((stage.pp(caster, "naturepower") || 0) < 20, "only the available source slot paid PP");
        stage.expect(stage.damageTo(foe) > 0, "the borrowed move contacted a normal native body");
        stage.note("real environment call", { called: naturepowerCalled, impactMove: naturepowerDamageMove, damage: stage.damageTo(foe), pp: stage.pp(caster, "naturepower") }); stage.done();
    }, "the real borrowed recipe lands");
});
