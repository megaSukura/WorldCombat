/**
 * 角钻 / horndrill 的可执行设计说明。
 *
 * 场面：晴天白天、开阔平地。只会角钻的铁甲犀牛（rhyhorn，40 级）对一只只会「跃起」的低级鲤鱼王
 *   （magikarp，12 级），相距 3 格；等级差把起钻蓄势压到最短，平坦地面又保证钻路通视、不会撞墙。
 *
 * 必然事实：本招被提交过；鲤鱼王受到过角钻的一次有限贯穿伤害。
 *   命中与否不写死：目标若在蓄势期间让开这条直线就会落空，写进 note 供读轨迹判断。
 */
Smoke.scenario("horndrill", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "rhyhorn", level: 40, moves: ["horndrill"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 12, moves: ["splash"], at: [0, 0, 0] });

    stage.until(360, function () { return caster.alive() && foe.alive(); }, function () {
        stage.hostile(caster, foe);
        stage.until(1200, function () {
            return stage.casts("horndrill", caster) > 0 && stage.damageTo(foe) > 0;
        }, function () {
            stage.expect(stage.casts("horndrill", caster) > 0, "角钻被放出来了");
            stage.expect(stage.damageTo(foe) <= 180, "一次钻击保持有限预算");
            stage.expect(stage.hits(caster) === 1, "首个身体只结算一次");
            stage.expect(stage.damageTo(foe) > 0, "钻头贯穿了目标，造成了有限伤害");
            stage.note("命中取决于目标是否还在这条钻路上；蓄势随等级差缩短，撞墙或钻到尽头都会落空；伤害由施法者自身物攻/等级/体重决定，不随目标剩余生命变化。",
                { casts: stage.casts("horndrill", caster), damage: Math.round(stage.damageTo(foe) * 10) / 10,
                  foeAlive: foe.alive(), foeHealth: Math.round(foe.health() * 10) / 10,
                  travelled: Math.round(stage.travelled(caster) * 10) / 10 });
            stage.done();
        }, "角钻命中");
    }, "双方存活");
});
