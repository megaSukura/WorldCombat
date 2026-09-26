/**
 * 突袭 / suckerpunch —— 可执行设计说明。
 *
 * 一句话：抢在对手出手的瞬间闪身刺出；对手不在出手就落空。
 *
 * 场面：一只只带「突袭」的狃拉（40 级）与一只僵尸贴身开战。僵尸会真的近身攻击狃拉，那次原生攻击在
 *   `window` 刻内被 `DamageSemantics.recentAttack` 读到，正好满足「目标正在出手」的读取，所以这一刺会被
 *   放出来并命中。只是追着跑、没有真实出手的敌人不会满足读取，也不该被无限触发。
 * 必然事实：突袭被提交过、僵尸受到过伤害。
 *   具体哪一次抓住、是否因为僵尸一时停手而落空，属时序结果，写进 note。
 */
Smoke.scenario("suckerpunch", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "sneasel", level: 40, moves: ["suckerpunch"], at: [-2, 0, 0], properties: "nature=adamant" });
    const foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("suckerpunch", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("suckerpunch", caster) >= 1, "sneasel committed sucker punch");
        stage.expect(stage.damageTo(foe) > 0, "the intercept struck the zombie");
        stage.note("shots that read wrong whiff (PP still spent, matching a failed move); the trace shows which casts landed. The read is a real completed native attack or a committed attack move inside the window; a foe that merely chases never counts.", {
            casts: stage.casts("suckerpunch", caster),
            dealt: Math.round(stage.damageBy(caster) * 10) / 10,
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            taken: Math.round(stage.damageTo(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "sucker punch lands on the zombie");
});
