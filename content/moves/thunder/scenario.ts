/**
 * 打雷的可执行设计说明。
 *
 * 场面：一只只会打雷的精灵，面对 8 格外的一只僵尸；`rain` 让天雷必中。
 * 为了让“雨天必中”这一条只取决于命中率，这里把目标用 noai 钉住，验证落点被占住时必定造成伤害；
 * “走出锁定落点就能躲开”的玩法由可移动目标承担，不在本场景里断言。
 * 必然事实：本招被提交过；这一记天雷本身造成了伤害（按 `world_combat.action` 的来源伤害计，避免把环境火力算进来）。
 * 是否把目标麻痹、落点半径与雷柱粗细属于概率与体型结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("thunder", function (stage) {
    stage.time("night");
    stage.weather("rain");
    var caster = stage.pokemon({ species: "Electabuzz", level: 40, moves: ["thunder"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    // 钉住目标，隔离“走位躲开”变量；可移动目标的落点预判仍按设计保留。
    stage.noai(foe);
    stage.until(900, function () {
        return stage.casts("thunder") > 0;
    }, function () {
        // 蓄云 + 兑现需要时间，等雷真正落下再判定。
        stage.after(40, function () {
            var dealt = 0, events = stage.damageEvents("world_combat.action");
            for (var i = 0; i < events.length; i++) dealt += events[i].amount;
            stage.expect(stage.casts("thunder") > 0, "thunder was committed");
            stage.expect(dealt > 0, "the bolt dealt damage in the rain");
            stage.note("thunder observations", { casts: stage.casts("thunder"), moveDamage: dealt, onFoe: stage.damageTo(foe),
                foeMoved: Math.round(stage.travelled(foe) * 10) / 10, foeAt: foe.position(), casterAt: caster.position(),
                paralyticFoe: stage.hadMobEffect(foe, "world_combat:status/paralysis") });
            stage.done();
        });
    }, "thunder cast");
});
