/**
 * 双倍奉还 / counter —— 可执行设计说明。
 *
 * 一句话：先挨一记物理打，再把那笔伤害以两倍打回去。
 *
 * 场面：一只只带「双倍奉还」的怪力与一只僵尸隔开几格、夜晚石地开战。僵尸用原版近战追打，
 *   这类来犯伤害没有作者类别，但由「造成者就是直接命中者」判定为物理，正好进账；怪力先迎上去站定，
 *   挨到第一记之后账本生效，再把那笔以两倍打回僵尸。
 * 必然事实：双倍奉还被提交过、施术者受过伤（这一记被记进账本）、僵尸受到过伤害。
 *   首击时机、账的大小与是否暴击是随机项，写进 note 供读轨迹判断。
 */
Smoke.scenario("counter", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "machoke", level: 40, moves: ["counter"], at: [0, 0, 0], properties: "nature=adamant" });
    const foe = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("counter", caster) >= 1 && stage.damageTo(foe) > 0 && stage.damageTo(caster) > 0;
    }, function () {
        stage.expect(stage.casts("counter", caster) >= 1, "machoke committed counter");
        stage.expect(stage.damageTo(caster) > 0, "the zombie's physical blow landed and was recorded");
        stage.expect(stage.damageTo(foe) > 0, "the doubled physical blow dealt damage");
        stage.note("the refund is twice the physical damage the caster actually took inside the window; the first offer whiffs until the zombie lands a hit", {
            casts: stage.casts("counter", caster),
            dealt: Math.round(stage.damageBy(caster) * 10) / 10,
            taken: Math.round(stage.damageTo(caster) * 10) / 10,
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "counter lands on the zombie within 50 s");
});
