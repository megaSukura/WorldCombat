/**
 * 青草滑梯 / grassyglide 的可执行设计说明。
 *
 * 一句话：贴地滑过去用身体铲一只不会还手的卡比兽，撞实只造成接触伤害，不在地面留下青草场地。
 *
 * 场面：只会青草滑梯的 Bulbasaur（32 级）对一只只会跃起、不会还手的 Snorlax（30 级）；平地、夜晚，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害；**本招不再自己种草**，所以荒野里没有青草来源时，目标不会被挂上
 *   共享身份 world_combat:status/grassyterrain。
 *   起手是否因脚下有草而归零（本场景没有现成青草，因此走普通起手）、实际滑了多远写进 note 供读轨迹判断。
 */
Smoke.scenario("grassyglide", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Bulbasaur", level: 32, moves: ["grassyglide"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 30, moves: ["splash"], at: [0, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("grassyglide", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("grassyglide", caster) > 0, "grassyglide was committed");
        stage.expect(stage.damageTo(foe) > 0, "the slide dealt damage");
        stage.expect(!stage.hadMobEffect(foe, "world_combat:status/grassyterrain"),
            "the slide seeds no grassy terrain of its own");
        stage.note("borrowing, not seeding: this move produces no Grassy Terrain, so a landed slam grants no grassyterrain identity. The zero-preparation branch only fires when the caster already stands on real grass, which this arena does not provide; read casterOnGrass to check.", {
            casts: stage.casts("grassyglide", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            casterOnGrass: stage.hasMobEffect(caster, "world_combat:status/grassyterrain"),
            tick: stage.tick()
        });
        stage.done();
    }, "grassyglide slides, damages, and seeds no terrain");
});
