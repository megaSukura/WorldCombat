/**
 * 跺脚 / stompingtantrum —— 可执行设计说明。
 *
 * 一句话：一只只会跺脚的宝可梦踩着地面，朝僵尸跺出一条地裂，把它掀起来。
 * 场面：Donphan（地面系，Lv40）只带跺脚，对一只平地上的僵尸；AI 必然跺脚。
 * 断言只取必然事实：本招被跺出过、僵尸吃到过伤害、地面被跺裂过（changedBlocks）。
 * 「上一次打空后翻倍」取决于是否先跺空，属时序结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("stompingtantrum", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "donphan", level: 40, moves: ["stompingtantrum"], at: [-1.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3.5, 0, 0] });
    stage.hostile(user, foe);
    stage.until(1400, function () {
        return stage.casts("stompingtantrum", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            var cracks = stage.changedBlocks().filter(function (entry) { return entry.before !== entry.after; });
            stage.expect(stage.casts("stompingtantrum", user) > 0, "donphan stomped the ground");
            stage.expect(stage.damageTo(foe) > 0, "the fissure damaged the foe");
            stage.expect(cracks.length > 0, "the ground was left cracked");
            stage.note("上一次出手落空后翻倍由 committed／damage_applied 记账决定；单场里是否先跺空是时序结果，读轨迹里的 damageIn 判断。", {
                casts: stage.casts("stompingtantrum", user),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(user) * 10) / 10,
                changed: cracks.length,
                grudge: stage.hadMobEffect(user, "world_combat:status/stompingtantrum"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "the tantrum lands");
});
