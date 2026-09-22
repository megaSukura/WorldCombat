/**
 * 复仇 / comeuppance —— 可执行设计说明。
 *
 * 一句话：先承受一记打击把仇记下（不分物理特殊），再放出暗影隔空追讨，以 1.5 倍还给账主。
 *
 * 场面：一只只带「复仇」的月伊布与一只僵尸隔开几格、夜晚石地开战。僵尸用原版近战追打，来犯伤害
 *   任何类别都进账；月伊布挨到第一记之后账本生效，再放出暗影追讨，隔一拍把账记以 1.5 倍还回去。
 * 必然事实：复仇被提交过、施术者受过伤（这一记被记进账本）、僵尸受到过伤害。
 *   首击时机、账的大小与是否暴击是随机项，写进 note 供读轨迹判断。
 */
Smoke.scenario("comeuppance", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "umbreon", level: 40, moves: ["comeuppance"], at: [0, 0, 0], properties: "nature=careful" });
    const foe = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("comeuppance", caster) >= 1 && stage.damageTo(foe) > 0 && stage.damageTo(caster) > 0;
    }, function () {
        stage.expect(stage.casts("comeuppance", caster) >= 1, "umbreon committed comeuppance");
        stage.expect(stage.damageTo(caster) > 0, "the zombie's blow landed and was recorded");
        stage.expect(stage.damageTo(foe) > 0, "the hunted shadow dealt damage");
        stage.note("the shadow returns 1.5x the last damage recorded on the caster after a short stalk delay; the first offer whiffs until a hit lands", {
            casts: stage.casts("comeuppance", caster),
            dealt: Math.round(stage.damageBy(caster) * 10) / 10,
            taken: Math.round(stage.damageTo(caster) * 10) / 10,
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "comeuppance lands on the zombie within 50 s");
});
