/**
 * 豁出去 / temperflare —— 可执行设计说明。
 *
 * 一句话：一只只会豁出去的宝可梦烧着自己撞向僵尸，撞上后炸开一圈火。
 * 场面：Charmeleon（火系，Lv40）只带豁出去，对一只平地上的僵尸；AI 必然冲锋。
 * 断言只取必然事实：本招被撞出过、僵尸吃到过伤害、场地被燎出焦痕（changedBlocks）。
 * 「上一次打空后翻倍、命中者被点着」取决于是否先撞空，属时序结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("temperflare", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "charmeleon", level: 40, moves: ["temperflare"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(user, foe);
    stage.until(1400, function () {
        return stage.casts("temperflare", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            var chars = stage.changedBlocks().filter(function (entry) { return entry.before !== entry.after; });
            stage.expect(stage.casts("temperflare", user) > 0, "charmeleon charged with temper flare");
            stage.expect(stage.damageTo(foe) > 0, "the ram damaged the foe");
            stage.expect(chars.length > 0, "the impact left a char on the ground");
            stage.note("翻倍与引燃由「上一次出手是否打空」的记账决定；单场里是否先撞空属时序结果。", {
                casts: stage.casts("temperflare", user),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(user) * 10) / 10,
                changed: chars.length,
                desperation: stage.hadMobEffect(user, "world_combat:status/temperflare"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "the flare lands");
});
