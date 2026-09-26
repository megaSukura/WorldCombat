Smoke.scenario("fairylock", function (stage) {
 const caster = stage.pokemon({ species: "klefki", level: 35, moves: ["fairylock"], at: [0,0,0] });
 const foe = stage.mob({ type: "minecraft:husk", at: [2,0,0] }); stage.noai(foe); stage.provoke(caster, foe);
 const speed = stage.attribute(foe, "minecraft:generic.movement_speed");
 stage.until(700, () => stage.hasMobEffect(foe, "world_combat:status/fairy_locked"), function () {
  stage.setPp(caster, "fairylock", 0);
  stage.expect(stage.hasMobEffect(caster, "world_combat:status/fairy_locked"), "caster joins the same boundary");
  stage.expect(Math.abs(stage.attribute(foe, "minecraft:generic.movement_speed") - speed) < .001, "interior keeps native movement speed");
  stage.command("execute as " + foe.ref.split("/")[0] + " at @s run tp @s ~10 ~ ~");
  stage.after(5, function () {
   stage.expect(!stage.hasMobEffect(foe, "world_combat:status/fairy_locked"), "external departure releases membership");
   stage.note("Symmetric membership and actual departure verified. Native received displacement refusal is covered by host checks; edge interaction remains a playtest item."); stage.done();
  });
 }, "finite fairy boundary");
});
