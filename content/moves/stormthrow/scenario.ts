Smoke.scenario("stormthrow", function (stage) {
 const caster = stage.pokemon({ species: "throh", level: 34, moves: ["stormthrow"], at: [-2,0,0] });
 const foe = stage.mob({ type: "minecraft:iron_golem", at: [0,0,0] }); stage.noai(foe); stage.provoke(caster, foe);
 stage.command("attribute " + foe.ref.split("/")[0] + " minecraft:generic.knockback_resistance base set 1");
 stage.until(700, () => stage.damageTo(foe) > 0, function () {
  stage.setPp(caster, "stormthrow", 0);
  stage.expect(stage.casts("stormthrow", caster) > 0, "actual close contact committed");
  stage.expect(!stage.hadMobEffect(foe, "world_combat:status/stagger"), "refused movement adds no forced stagger");
  stage.expect(stage.changedBlocks().length === 0, "throw leaves the floor intact");
  stage.note("An immovable native target received the one grip strike without forced movement/stagger; successful side-turn appearance remains a playtest item."); stage.done();
 }, "native refused throw");
});
