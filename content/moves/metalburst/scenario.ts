/**
 * 金属爆炸 / metalburst —— 可执行设计说明。
 *
 * 一句话：先承受一记打击把应力储进金属壳（物理特殊都算），再把它以 1.5 倍从体内炸出去。
 *
 * 场面：一只只带「金属爆炸」的大钢蛇与一只僵尸隔开几格、夜晚石地开战。僵尸用原版近战追打，
 *   来犯伤害任何类别都进账；大钢蛇挨到第一记之后账本生效，再从体内把这份应力炸回僵尸。
 * 必然事实：金属爆炸被提交过、施术者受过伤（这一记被记进账本）、僵尸受到过伤害。
 *   首击时机、账的大小与是否暴击是随机项，写进 note 供读轨迹判断。
 */
Smoke.scenario("metalburst", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "steelix", level: 40, moves: ["metalburst"], at: [0, 0, 0], properties: "nature=impish" });
    const foe = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("metalburst", caster) >= 1 && stage.damageTo(foe) > 0 && stage.damageTo(caster) > 0;
    }, function () {
        stage.expect(stage.casts("metalburst", caster) >= 1, "steelix committed metal burst");
        stage.expect(stage.damageTo(caster) > 0, "the zombie's blow landed and was recorded");
        stage.expect(stage.damageTo(foe) > 0, "the boosted blast dealt damage");
        stage.note("the blast returns 1.5x the last damage recorded on the caster and splashes a share to other enemies in radius; the first offer whiffs until a hit lands", {
            casts: stage.casts("metalburst", caster),
            dealt: Math.round(stage.damageBy(caster) * 10) / 10,
            taken: Math.round(stage.damageTo(caster) * 10) / 10,
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "metal burst lands on the zombie within 50 s");
});
