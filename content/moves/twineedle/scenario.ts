/**
 * 双针 / twineedle —— 可执行设计说明。
 *
 * 一句话：端起两根针先后刺出，第一针开伤口、第二针冲着伤口去。
 *
 * 场面：一只只会双针的骑士蜗牛（escavalier，L30，原生学习者）对一只只会跃起、站桩的卡比兽（snorlax，L30），
 *   相隔 5 格——在射程内，AI 可以直接出针；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一根针的伤害（`stage.damageTo`）。
 * 随机量写进 note：两针各自的命中与中毒掷签、第二针的伤口加成、暴击，供读轨迹判断。
 */
Smoke.scenario("twineedle", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "escavalier", level: 30, moves: ["twineedle"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("twineedle", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("twineedle", caster) >= 1, "the caster committed twineedle");
            stage.expect(stage.damageTo(foe) > 0, "twineedle dealt damage to the foe");
            stage.note("each needle rolls poison separately (native 20%%); the second gains a wound bonus if the first landed; crit is variable", {
                casts: stage.casts("twineedle", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foePoisoned: stage.hadMobEffect(foe, "world_combat:status/poison"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "twineedle sticks a foe within 60 s");
});
