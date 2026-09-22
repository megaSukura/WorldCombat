/**
 * 水流裂破的可执行设计说明。
 *
 * 场面：一只水属性精灵（Floatzel）对 3 格外的一只厚血精灵（Snorlax，只会撞击）开战。选厚血对手是为了让
 * 目标在挨过第一撞后仍然活着，湿身身份才能被观察到；夜晚避免无关的日光灼烧污染伤害统计。
 * 双方开战，AI 只有这些招可用。
 * 必然事实：本招被提交过；目标受到过伤害（正面撞实）；目标身上出现过共享身份 `world_combat:status/soaked`
 * （撞实即挂湿身，与波动冲、水流尾共用同一身份）。
 * 破防是否掷中、压了几级、暴击，都是概率结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("liquidation", function (stage) {
    stage.time("night");
    var soaked = "world_combat:status/soaked";
    var caster = stage.pokemon({ species: "Floatzel", level: 32, moves: ["liquidation"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 34, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("liquidation") > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(foe, soaked);
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("liquidation") > 0, "liquidation was committed");
            stage.expect(stage.damageTo(foe) > 0, "liquidation dealt damage");
            stage.expect(stage.hadMobEffect(foe, soaked), "the ram left the target soaked");
            stage.note("liquidation observations", { casts: stage.casts("liquidation"), onFoe: stage.damageTo(foe),
                soaked: stage.hadMobEffect(foe, soaked), sundered: stage.hadMobEffect(foe, "world_combat:status/sundered"),
                moved: Math.round(stage.travelled(caster) * 10) / 10 });
            stage.done();
        });
    }, "liquidation lands and soaks");
});
