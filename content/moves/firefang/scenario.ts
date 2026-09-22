/**
 * 火焰牙 / firefang 的可执行设计说明。
 *
 * 场面：只会火焰牙的黑鲁加（houndoom，L40，原生学习者）对 5 格外的卡比兽（snorlax，L50，只会跃起）；
 * 平地、白天晴天。开战后 AI 只有这一招可用，必须自己走近再咬。
 * 必然事实：本招被提交过；目标受到过咬合伤害。
 * 是否灼伤（scorchChance）、烧多久、穿甲窗口是否生效、是否咬懵、扑空还是咬中、暴击，都是概率与站位结果，
 * 写进 note 供读轨迹判断。
 */
Smoke.scenario("firefang", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "houndoom", level: 40, moves: ["firefang"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 50, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("firefang", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("firefang", caster) > 0, "firefang was committed");
            stage.expect(stage.damageTo(foe) > 0, "the fire fang dealt damage");
            stage.note("scorchChance and flinchChance are separate rolls; the burn lands through the pierce window, so a fire-immune body can still catch it", {
                casts: stage.casts("firefang", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                burned: stage.hadMobEffect(foe, "world_combat:status/burn"),
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "fire fang lands on a foe within range");
});
