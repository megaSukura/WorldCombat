/**
 * 珍藏 / lastresort 的可执行设计说明。
 *
 * 场面：招式表为「愤怒 + 珍藏」的喵喵（40 级、固执）对一只僵尸，夜间，两者开战。
 *   愤怒会在珍藏未解锁时先被打出（它没有前置条件、冷却短），它一提交，账本上就多一笔，
 *   珍藏随之解锁；愤怒的「怒气」姿态还在身上时愤怒不可再选，珍藏于是成为唯一选项被掏出。
 * 必然事实：珍藏被提交过（其他已实装的招都出过）；目标受到过伤害。
 * 是否一击致死、是否撞空、暴击等写进 note 供读轨迹判断。
 *
 * 说明：本场景用到的另一招「愤怒」也是本组单元；smoke 运行会同时装配本组四个单元。
 */
Smoke.scenario("lastresort", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "meowth", level: 40, moves: ["rage", "lastresort"], at: [-2, 0, 0], properties: "nature=adamant" });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1600, function () {
        return stage.casts("lastresort", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("lastresort", caster) > 0, "last resort was committed after the other move was used");
        stage.expect(stage.damageTo(foe) > 0, "the trump slam dealt damage");
        stage.note("the unlock requires every other implemented move to be committed once; the trace shows rage first, then last resort", {
            rageCasts: stage.casts("rage", caster),
            lastResortCasts: stage.casts("lastresort", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            wounded: stage.hadMobEffect(caster, "world_combat:status/rage"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "last resort unlocks and lands after the other move");
});
