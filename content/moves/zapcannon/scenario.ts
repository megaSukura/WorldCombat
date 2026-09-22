/**
 * 电磁炮 / zapcannon —— 可执行设计说明。
 *
 * 一句话：蓄满一炮，射出一颗慢而沉的电弹；难中，但一中必麻。
 *
 * 场面：一只只会电磁炮的磁怪（L40）对一只昏睡的小海狮（L30），相隔 10 格（在射程内）。
 *   昏睡让弹体有一个几乎不动的目标，用来验证「慢弹命中」这条主线；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过；目标受到过炮弹伤害；目标身上出现过共享麻痹身份
 *   （本招的麻痹是必定生效的，不是随机掷——若目标为电属性则免疫，本场景用非电属性的小海狮）。
 * 随机量写进 note：暴击、以及慢弹对走位的修正量。
 */
Smoke.scenario("zapcannon", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnemite", level: 40, moves: ["zapcannon"], at: [-5, 0, 0] });
    var foe = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("zapcannon", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("zapcannon", caster) >= 1, "the caster committed zap cannon");
            stage.expect(stage.damageTo(foe) > 0, "the shell dealt damage to the foe");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/paralysis"), "the shell paralysed the foe (guaranteed on hit)");
            stage.note("crit and how much the limited homing had to steer are random; the recoil pushes the caster back and is a position result", {
                casts: stage.casts("zapcannon", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeParalysed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
                casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "zap cannon lands on a foe within 70 s");
});
