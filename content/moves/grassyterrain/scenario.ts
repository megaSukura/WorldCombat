// 青草场地：把草种到交战区，站上去的人被草托住。断言三件必然事实：放出来了、施法者挂上共享的草地身份、
// 受伤后站在草地上会被回血。草招加成与地震减半在伤害结算里读取（私有装配没有第二个施法者），留给轨迹与试玩观察。
Smoke.scenario("grassyterrain", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "bulbasaur", level: 30, moves: ["grassyterrain"], at: [-3, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 20, moves: [], at: [5, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("grassyterrain", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/grassyterrain");
    }, function () {
        stage.expect(stage.casts("grassyterrain", caster) > 0, "grassyterrain was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/grassyterrain"), "the grounded caster carries the shared grassyterrain identity");
        const at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] 8 minecraft:generic");
        stage.after(20, function () {
            const wounded = caster.health();
            stage.after(160, function () {
                stage.expect(caster.alive() && caster.health() > wounded, "the grass restored the wounded caster");
                stage.note("grass laid under the caster; after being wounded it recovered while standing on the grass. Grass x1.3 / Earthquake x0.5 and plant tending are left to play.",
                    { casts: stage.casts("grassyterrain", caster), wounded: Math.round(wounded * 10) / 10,
                      recovered: Math.round(caster.health() * 10) / 10 });
                stage.done();
            });
        });
    }, "grass covers the arena");
});
