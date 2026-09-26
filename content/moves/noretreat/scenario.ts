Smoke.scenario("noretreat", function (stage) {
 const caster = stage.pokemon({ species: "falinks", level: 35, moves: ["noretreat"], at: [0,0,0] });
 const foe = stage.mob({ type: "minecraft:husk", at: [2,0,0] }); stage.noai(foe); stage.provoke(caster, foe);
 stage.until(700, () => stage.hasMobEffect(caster, "world_combat:status/noretreat"), function () {
  stage.setPp(caster, "noretreat", 0);
  stage.expect(stage.stages(caster).atk === 1 && stage.stages(caster).spe === 1, "oath owns all-stat layers");
  stage.expect(stage.attribute(caster, "minecraft:generic.movement_speed") > .01, "oath permits movement inside");
  stage.command("execute as " + caster.ref.split("/")[0] + " at @s run tp @s ~10 ~ ~");
  stage.after(5, function () {
   stage.expect(!stage.hasMobEffect(caster, "world_combat:status/noretreat") && stage.stages(caster).atk === 0, "external departure withdraws the oath and its layers");
   stage.note("Carrier, mobile interior and external-departure lifecycle verified; edge feel remains a playtest item."); stage.done();
  });
 }, "local oath");
});
