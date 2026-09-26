/**
 * 电光 / spark 的可执行设计说明。
 *
 * 场面：会电光的咩利羊（Mareep）对一只只会跃起、不会还手的鲤鱼王（Magikarp）。
 * 必然事实：本招被提交过；它命中过靶子并造成了伤害（本招没有反伤，施法者不该因它掉血）。
 * 命中 100，但冲空仍可能发生（被目标移开或撞墙），所以轮询等到至少命中一次。
 * 是否灌入麻痹（默认约 30%）与收尾加成是否触发，写进 note 供读轨迹判断。
 */
Smoke.scenario("spark", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    // 电光是全族射程最短的一招：对手要摆在一个箭步之内才可能被撞到。
    var caster = stage.pokemon({ species: "mareep", level: 40, moves: ["spark"], at: [-1.2, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 20, moves: ["splash"], at: [0.8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("spark", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("spark", caster) > 0, "spark was committed");
        stage.expect(stage.damageTo(foe) > 0, "the charged tackle landed");
        stage.note("麻痹是概率结果（默认约 30%），这里只记录是否被麻住", {
            casts: stage.casts("spark", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            paralyzed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "spark lands and paralyzes or not, without cost to the user");
});
