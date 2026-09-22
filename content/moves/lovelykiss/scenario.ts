/**
 * 恶魔之吻 / lovelykiss 的可执行设计说明。
 *
 * 场面：晴天白天、开阔石地。一只只会恶魔之吻的迷唇姐（jynx）对一只只会「跃起」的呆壳兽（slowpoke）
 *   隔开一段距离；它必须自己贴地猛扑过去才能吻到。呆壳兽不还手，让「扑到并入眠」可复现。
 *
 * 必然事实：恶魔之吻被提交过，且被吻到的目标身上出现过共享的睡眠身份（world_combat:status/sleep）。
 * 随机结果：能不能扑到由双方速度差决定（参数公式的 landChance），中途撞墙或目标提前走开则扑空；
 *   失败次数、走了多远、实际落点都写进 note 供读轨迹判断。
 */
Smoke.scenario("lovelykiss", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "jynx", level: 40, moves: ["lovelykiss"], at: [-5, 0, 0] });
    var target = stage.pokemon({ species: "slowpoke", level: 22, moves: ["splash"], at: [5, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("lovelykiss", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/sleep");
    }, function () {
        stage.expect(stage.casts("lovelykiss", caster) > 0, "lovely kiss was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/sleep"), "the kissed target carried the shared sleep identity");
        stage.expect(stage.travelled(caster) > 1, "the lunge carried the user toward the target");
        stage.note("它必须先把身体送过去：AI 先接近到起扑距离，再沿直线突进；目标比施法者更快时才可能扭开。", {
            casts: stage.casts("lovelykiss", caster),
            travelled: Math.round(stage.travelled(caster) * 10) / 10,
            casterHp: Math.round(caster.health() * 10) / 10,
            targetHp: Math.round(target.health() * 10) / 10
        });
        stage.done();
    }, "lovely kiss pounces on the target");
});
