Smoke.scenario("matblock", function (stage) {
 const caster = stage.pokemon({ species: "turtwig", level: 34, moves: ["matblock"], at: [0,0,0] });
 const ally = stage.mob({ type: "minecraft:husk", at: [-1,0,0] }), foe = stage.mob({ type: "minecraft:zombie", at: [4,0,0] });
 stage.noai(ally); stage.noai(foe); stage.team("mat", [caster, ally]); stage.provoke(caster, foe);
 stage.until(700, () => stage.hadMobEffect(ally, "world_combat:status/matblock"), function () {
  stage.setPp(caster, "matblock", 0);
  stage.expect(stage.hadMobEffect(caster, "world_combat:status/matblock"), "caster covered");
  stage.expect(stage.hadMobEffect(ally, "world_combat:status/matblock"), "nearby ally receives sheet membership");
  stage.note("Shared membership verified. Actual native source-position plane intersection controls each interception; front/back crossing and the fixed sheet are manual interaction checks."); stage.done();
 }, "mat sheet membership");
});
