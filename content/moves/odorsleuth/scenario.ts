Smoke.scenario("odorsleuth", function (stage) {
 const caster = stage.pokemon({ species: "sentret", level: 30, moves: ["odorsleuth"], at: [-3,0,0] });
 const target = stage.mob({ type: "minecraft:husk", at: [2,0,0] }); stage.noai(target); stage.provoke(caster, target);
 const speed = stage.attribute(target, "minecraft:generic.movement_speed");
 stage.until(700, () => stage.hasMobEffect(target, "world_combat:status/odorsleuth"), function () {
  stage.setPp(caster, "odorsleuth", 0);
  stage.expect(stage.hasMobEffect(target, "world_combat:status/foresight"), "native identification identity is present");
  stage.expect(Math.abs(stage.attribute(target, "minecraft:generic.movement_speed") - speed) < .001, "scent does not slow its subject");
  stage.expect(!stage.hasMobEffect(target, "minecraft:glowing"), "scent does not reveal hidden live coordinates");
  stage.note("Identity and absence of the old movement/glowing side effects verified. Occluded navigation uses a finite saved visible point and is reserved for manual interaction review."); stage.done();
 }, "visible scent subject");
});
