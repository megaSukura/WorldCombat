/**
 * 水流裂破的可执行设计说明。
 *
 * 场面：一只水属性精灵（Floatzel）面对两只并排站定、不会行动的厚血精灵（Snorlax），它们分列前方左右各一只，
 * 让同一趟横向水刃有机会同时擦到；夜晚避免无关的日光灼烧污染伤害统计。
 * 必然事实：本招被提交过；至少一个目标受到过伤害（正面擦实）；至少一个目标身上出现过共享身份
 * `world_combat:status/soaked`（擦实即挂湿身，与波动冲、水流尾共用同一身份）。
 * 「同一趟擦到两人」与破防是否掷中、压了几级、暴击，都是位置与概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("liquidation", function (stage) {
    stage.time("night");
    var soaked = "world_combat:status/soaked";
    var caster = stage.pokemon({ species: "Floatzel", level: 32, moves: ["liquidation"], at: [0, 0, 0] });
    var left = stage.pokemon({ species: "Snorlax", level: 34, moves: ["tackle"], at: [0.9, 0, 2.4] });
    var right = stage.pokemon({ species: "Snorlax", level: 34, moves: ["tackle"], at: [-0.9, 0, 2.4] });
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.noai(left, right);
    stage.until(900, function () {
        return stage.casts("liquidation") > 0
            && (stage.damageTo(left) > 0 || stage.damageTo(right) > 0)
            && (stage.hadMobEffect(left, soaked) || stage.hadMobEffect(right, soaked));
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("liquidation") > 0, "liquidation was committed");
            stage.expect(stage.damageTo(left) > 0 || stage.damageTo(right) > 0, "the sweep cut at least one target");
            stage.expect(stage.hadMobEffect(left, soaked) || stage.hadMobEffect(right, soaked), "the sweep left a target soaked");
            stage.note("liquidation observations", { casts: stage.casts("liquidation"),
                left: stage.damageTo(left), right: stage.damageTo(right),
                leftSoaked: stage.hadMobEffect(left, soaked), rightSoaked: stage.hadMobEffect(right, soaked),
                leftSundered: stage.hadMobEffect(left, "world_combat:status/sundered"),
                rightSundered: stage.hadMobEffect(right, "world_combat:status/sundered"),
                moved: Math.round(stage.travelled(caster) * 10) / 10 });
            stage.done();
        });
    }, "liquidation sweeps and soaks");
});
