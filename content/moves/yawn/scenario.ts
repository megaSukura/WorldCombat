/**
 * 哈欠 / yawn 的可执行设计说明。
 *
 * 场面：晴天白天、开阔石地。一只只会哈欠的卡比兽（snorlax）对一只只会「跃起」的呆壳兽（slowpoke）隔空打哈欠；
 *   呆壳兽不还手，让「必中一次、睡意走完再睡」这条链可复现。
 *
 * 必然事实：哈欠被提交过；目标身上先后出现过共享的「睡意」身份（world_combat:status/yawn）与共享的
 *   睡眠身份（world_combat:status/sleep）——这一记必中，睡意到点自己转成睡眠。
 * 随机／可变项：睡意窗口与实际入睡时刻由参数公式的 drowsyTicks 与目标走位决定，写进 note 供读轨迹判断。
 */
Smoke.scenario("yawn", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "snorlax", level: 36, moves: ["yawn"], at: [-5, 0, 0] });
    var target = stage.pokemon({ species: "slowpoke", level: 22, moves: ["splash"], at: [5, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("yawn", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/yawn");
    }, function () {
        stage.expect(stage.casts("yawn", caster) > 0, "yawn was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/yawn"), "the target carried the shared drowsiness identity");
        stage.note("哈欠必中，先挂上睡意，走完窗口才转入睡眠；窗口里解掉或被别的状态占住就会作废。", {
            casts: stage.casts("yawn", caster),
            drowsySeen: stage.hadMobEffect(target, "world_combat:status/yawn"),
            targetHp: Math.round(target.health() * 10) / 10
        });
        stage.until(600, function () { return stage.hadMobEffect(target, "world_combat:status/sleep"); }, function () {
            stage.expect(stage.hadMobEffect(target, "world_combat:status/sleep"), "the drowsiness turned into shared sleep");
            stage.note("睡意走完自动转成共享睡眠；没被打断就会睡着。", {
                sleepSeen: stage.hadMobEffect(target, "world_combat:status/sleep"),
                targetHp: Math.round(target.health() * 10) / 10
            });
            stage.done();
        }, "drowsiness resolves into sleep");
    }, "yawn marks the target");
});
