/**
 * 报仇 / retaliate —— 可执行设计说明。
 *
 * 一句话：带着「同伴倒下」的哀兵之痛，朝敌人直直撞过去；这一记比平时翻倍。
 * 场面：Lucario（Lv45，只带报仇）对一只僵尸；开场后脚本直接给 Lucario 挂上本单元的共享身份
 *   world_combat:retaliate（等同同伴倒下后留下的哀兵），AI 带着它起手。
 * 断言：本招被撞出过、僵尸吃到过伤害、Lucario 身上带着共享身份 retaliate（消费方按身份读到）。
 * 「哀兵由同伴倒下自动挂上」的那条链靠 world_combat:damage_applied + isAlliedTo，见报告说明。
 */
Smoke.scenario("retaliate", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "lucario", level: 45, moves: ["retaliate"], at: [-1.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.hostile(user, foe);
    stage.after(20, function () { stage.command("effect give @e[type=cobblemon:pokemon] world_combat:retaliate_mourning 600 0"); });
    stage.until(1600, function () {
        return stage.casts("retaliate", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("retaliate", user) > 0, "lucario struck back");
            stage.expect(stage.damageTo(foe) > 0, "the retribution damaged the foe");
            stage.expect(stage.hadMobEffect(user, "world_combat:status/retaliate"), "the grief identity was on the avenger");
            stage.note("哀兵状态由脚本直接挂上以固定触发；翻倍由共享身份 retaliate 决定，AI 也按这个身份排序。", {
                casts: stage.casts("retaliate", user),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(user) * 10) / 10,
                mourning: stage.hadMobEffect(user, "world_combat:status/retaliate"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "retribution lands");
});
