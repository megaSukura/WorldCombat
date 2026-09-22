/**
 * 催眠术 / hypnosis 的可执行设计说明。
 *
 * 场面：晴天白天、开阔石地。只会催眠术的引梦貘人（hypno）对一只只会「跃起」的呆壳兽（slowpoke）隔空凝视；
 *   呆壳兽不还手，让「送进睡眠」这件事可复现。两者敌对后 AI 自己走位、保持通视再放。
 *
 * 必然事实：催眠术被提交过，且目标身上出现过共享的睡眠身份（world_combat:status/sleep）。
 * 随机结果：这一记意志对抗成不成立由双方特攻／特防与等级决定（参数公式的 landChance），失败的几次
 *   光环散开、只留下困意残影；漂移、走位与失败次数都写进 note 供读轨迹判断。
 */
Smoke.scenario("hypnosis", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "hypno", level: 42, moves: ["hypnosis"], at: [-6, 0, 0] });
    var target = stage.pokemon({ species: "slowpoke", level: 22, moves: ["splash"], at: [6, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("hypnosis", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/sleep");
    }, function () {
        stage.expect(stage.casts("hypnosis", caster) > 0, "hypnosis was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/sleep"), "the target carried the shared sleep identity");
        stage.note("催眠术沿通视直线送一次暗示，能否成立由双方特攻/特防与等级对抗决定；失败的几次只在目标身上散开。", {
            casts: stage.casts("hypnosis", caster),
            casterHp: Math.round(caster.health() * 10) / 10,
            targetHp: Math.round(target.health() * 10) / 10
        });
        stage.done();
    }, "hypnosis puts the target to sleep");
});
