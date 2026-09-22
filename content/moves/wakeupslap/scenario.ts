/**
 * 唤醒巴掌 / wakeupslap 的可执行设计说明。
 *
 * 一句话：一记把睡着的对手拍醒的重掌——睡着时翻倍。
 *
 * 场面：一只只带这一招的相扑手（Hariyama）贴身对一只开场就睡着的、血厚等级更高的陪练（Snorlax）；
 *   睡眠用原生状态设成 sleep，经共享镜像落成身份 world_combat:status/sleep。
 * 必然事实：本招被提交过；对手吃到过伤害；对手身上出现过睡眠身份；命中后睡眠身份被清除（被拍醒）。
 * 翻倍是否生效、是否触发余震写进 note，供读轨迹判断。
 */
Smoke.scenario("wakeupslap", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "Hariyama", level: 40, moves: ["wakeupslap"], at: [-1, 0, 0], properties: "nature=adamant" });
    var foe = stage.pokemon({ species: "Snorlax", level: 60, moves: [], at: [1, 0, 0], status: "sleep" });
    stage.hostile(user, foe);
    stage.until(1600, function () {
        return stage.casts("wakeupslap", user) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("wakeupslap", user) > 0, "hariyama committed wake-up slap");
            stage.expect(stage.damageTo(foe) > 0, "the slap dealt damage");
            stage.expect(stage.hadMobEffect(foe, "world_combat:sleep"), "the target carried the sleep identity");
            stage.expect(!stage.hasMobEffect(foe, "world_combat:status/sleep"), "the slap woke the target");
            stage.note("the doubling read the sleep identity at hit time; the wake also follows the shared rule that any damage breaks sleep", {
                casts: stage.casts("wakeupslap", user),
                dealt: Math.round(stage.damageBy(user) * 10) / 10,
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                woken: !stage.hasMobEffect(foe, "world_combat:status/sleep"),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "wake-up slap lands and wakes the target");
});
