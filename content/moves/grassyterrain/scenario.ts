// 青草场地：把草种到交战区，站上去的伤者被草托住。断言三件必然事实：放出来了、施法者挂上共享的草地身份、
// 受伤后站在草地上会被回血。施法者先受一点伤，AI 才会把这块草读成对己方净收益并出手。
// 草招加成与受击者侧的地震减伤在伤害结算里读取（私有装配没有第二个施法者），留给轨迹与试玩观察。
Smoke.scenario("grassyterrain", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "bulbasaur", level: 30, moves: ["grassyterrain"], at: [-3, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 20, moves: [], at: [5, 0, 0] });
    stage.hostile(caster, target);
    // 先弄伤施法者：草地是双方共享的续航，只有己方伤得更重时 AI 才会替己方铺草。
    let wounded = 0;
    stage.after(1, function () {
        const at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] 18 minecraft:generic");
        wounded = caster.health();
    });
    stage.until(900, function () {
        return stage.casts("grassyterrain", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/grassyterrain");
    }, function () {
        stage.expect(stage.casts("grassyterrain", caster) > 0, "grassyterrain was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/grassyterrain"), "the grounded caster carries the shared grassyterrain identity");
        stage.after(160, function () {
            stage.expect(caster.alive() && caster.health() > wounded, "the grass restored the wounded caster");
            stage.note("grass laid under the caster while it was the side more hurt; it recovered while standing on the grass. Grass x1.3 and defender-side Earthquake x0.5 and plant tending are left to play.",
                { casts: stage.casts("grassyterrain", caster), wounded: Math.round(wounded * 10) / 10,
                  recovered: Math.round(caster.health() * 10) / 10 });
            stage.done();
        });
    }, "grass covers the arena");
});
