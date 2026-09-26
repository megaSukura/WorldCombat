/**
 * 鬼火的可执行设计说明。
 *
 * 场面：一只只会鬼火的鬼斯对 4 格外的卡比兽放冷焰，卡比兽没有招式、站着挨烧，距离在射程内，AI 会直接出手。
 * 本招现在是 aim：AI 会锁定这个敌对且物攻占优的目标，鬼火有限转向追它；手动空瞄直飞、撞墙熄灭与免疫反馈属于交互范围。
 * 必然事实：本招被提交过；目标身上出现过共享灼伤（`world_combat:burn` 效果与 `world_combat:status/burn` 身份）；
 * 灼伤跳过一次伤害。
 * 随机结果：鬼火能不能追上目标、灼伤时长与目标走位都写进 note 供读轨迹判断。
 */
Smoke.scenario("willowisp", function (stage) {
    var caster = stage.pokemon({ species: "Gastly", level: 35, moves: ["willowisp"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: [], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("willowisp") > 0 && stage.hadMobEffect(target, "world_combat:status/burn");
    }, function () {
        stage.expect(stage.casts("willowisp") > 0, "will-o-wisp was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:burn"), "the shared default burn effect landed on the target");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/burn"), "the burn carries the shared identity");
        var start = target.health();
        stage.note("wisp caught the target", { casts: stage.casts("willowisp"), health: start });
        stage.until(320, function () { return stage.damageTo(target) > 0; }, function () {
            stage.expect(stage.damageTo(target) > 0, "the burn dealt damage");
            stage.note("burn ticked", { damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                from: start, to: target.health(), alive: target.alive() });
            stage.done();
        }, "burn ticks");
    }, "wisp lands");
});
