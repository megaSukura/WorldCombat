/**
 * 断头钳 / guillotine 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会断头钳的凯罗斯（pinsir，40 级）对一只只会「跃起」的低级鲤鱼王
 *   （magikarp，12 级），相距 1.5 格；等级差把合拢延迟压到最短，贴身距离保证目标在身前扇形里。
 *
 * 必然事实：本招被提交过；鲤鱼王受到过断头钳的处决伤害（生命被一次夹断）。
 *   命中与否不写死：目标若在合拢前离开身前扇形就会夹空，写进 note 供读轨迹判断。
 */
Smoke.scenario("guillotine", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "pinsir", level: 40, moves: ["guillotine"], at: [-1.5, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 12, moves: ["splash"], at: [0, 0, 0] });

    stage.until(360, function () { return caster.alive() && foe.alive(); }, function () {
        stage.hostile(caster, foe);
        stage.until(1200, function () {
            return stage.casts("guillotine", caster) > 0 && stage.damageTo(foe) > 0;
        }, function () {
            stage.expect(stage.casts("guillotine", caster) > 0, "断头钳被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "钳口咬合了目标，造成了伤害");
            stage.note("命中取决于目标是否还在身前扇形里；合拢延迟随等级差缩短，夹空只留一声脆响。",
                { casts: stage.casts("guillotine", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  foeAlive: foe.alive(), foeHealth: Math.round(foe.health() * 10) / 10 });
            stage.done();
        }, "断头钳命中");
    }, "双方存活");
});
