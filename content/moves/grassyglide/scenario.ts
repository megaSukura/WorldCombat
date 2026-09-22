/**
 * 青草滑梯 / grassyglide 的可执行设计说明。
 *
 * 一句话：贴地滑过去用身体铲一只不会还手的卡比兽，撞实后落点压出一片青草，把站在上面的卡比兽标记为「在青草场地上」。
 *
 * 场面：只会青草滑梯的 Bulbasaur（32 级）对一只只会跃起、不会还手的 Snorlax（30 级）；两者都站在地上，
 *   草皮的「贴地才生效」检查因此成立。AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害；落点的草皮给贴地的目标挂上了共享身份 world_combat:status/grassyterrain
 *   （只要撞实就一定会种下草皮，草皮每 5 刻扫一次半径内的贴地活体）。
 *   起手是否因脚下有草而归零、草皮实际覆盖几格、站位偏差导致的射空都写进 note 供读轨迹判断。
 */
Smoke.scenario("grassyglide", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Bulbasaur", level: 32, moves: ["grassyglide"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 30, moves: ["splash"], at: [0, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("grassyglide", caster) > 0 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/grassyterrain");
    }, function () {
        stage.expect(stage.casts("grassyglide", caster) > 0, "grassyglide was committed");
        stage.expect(stage.damageTo(foe) > 0, "the slide dealt damage");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/grassyterrain"),
            "the landing grew grass that marks the grounded target as being on grassy terrain");
        stage.note("grass is the shared grassyterrain identity; a landed slam always presses a patch at the struck target, so the grounded Snorlax is marked within a few scans. Whether the caster also stands on grass (and would get a zero-preparation follow-up) is positional.", {
            casts: stage.casts("grassyglide", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            casterOnGrass: stage.hasMobEffect(caster, "world_combat:status/grassyterrain"),
            tick: stage.tick()
        });
        stage.done();
    }, "grassyglide plants grass where it lands");
});
