/**
 * 电力上升 / risingvoltage 的可执行设计说明。
 *
 * 场面：一只只会「电力上升」的 pikachu 对上一只耐打的 snorlax，目标站定不动，用来走到「锁定柱底 → 电流爬过去 →
 *   竖起电柱 → 命中」这条必然路径。
 * 断言只取必然事实：这招被提交过、伤害落到了目标身上。柱底在出手时锁定，空柱也能执行——但这些花式分支不在本
 *   私有装配里强制：电气场地的电荷身份 `world_combat:electricterrain_ground` 由电气场地单元注册，本装配不含它，
 *   所以「脚下带电翻倍」按参数公式在单元检查里覆盖，实际观感与条件留给完整装配人工试玩。暴击、命中率、电流爬行
 *   时刻写进 note 供读轨迹判断。
 */
Smoke.scenario("risingvoltage", function (stage) {
    stage.fill([-14, -1, -14], [14, -1, 14], "minecraft:stone");
    stage.fill([-14, 0, -14], [14, 8, 14], "minecraft:air");
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "pikachu", level: 36, moves: ["risingvoltage"], at: [-6, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("risingvoltage", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("risingvoltage", caster) > 0, "pikachu committed rising voltage");
        stage.expect(stage.damageTo(foe) > 0, "the rising column damaged the target");
        stage.note("the base is locked when the move fires, so the column rises there even if the target moves; an empty cast still raises a column. The electric-terrain doubling branch is not staged here because the private assembly does not register world_combat:electricterrain_ground; it is covered by the parameter formula. Variables: hit chance, crit, and the exact crawl delay before the column rises.", {
            casts: stage.casts("risingvoltage", caster),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive(),
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "rising voltage lands within 45 s");
});
