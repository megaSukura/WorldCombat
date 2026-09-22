/**
 * 勇鸟猛攻 / bravebird 的可执行设计说明。
 *
 * 场面：会勇鸟猛攻的姆克鹰（Staraptor）对两只只会跃起、不会还手的鲤鱼王（Magikarp），
 * 两只靶子沿施法者的俯冲方向排成一列。这样既能观察到“俯冲穿中目标”，也有机会看到“一串串两个人”。
 * 必然事实：本招被提交过；至少一只靶子受到过伤害（俯冲撞实）；施法者自己也受到过伤害（按反伤比例反震）。
 * 穿中几只、是否一次串起两个、暴击与命中位置，取决于 AI 站位与俯冲线，写进 note 供读轨迹判断。
 */
Smoke.scenario("bravebird", function (stage) {
    stage.fill([-8, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Staraptor", level: 42, moves: ["bravebird"], at: [-3.5, 0, 0] });
    // 两只只带跃起、不会还手的靶子排在一条线上：施法者的掉血只可能来自这一招的反震。
    var first = stage.pokemon({ species: "Magikarp", level: 22, moves: ["splash"], at: [0, 0, 0] });
    var second = stage.pokemon({ species: "Magikarp", level: 22, moves: ["splash"], at: [3.5, 0, 0] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(900, function () {
        return stage.casts("bravebird", caster) > 0 && stage.damageTo(caster) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("bravebird", caster) > 0, "bravebird was committed");
            stage.expect(stage.damageTo(first) + stage.damageTo(second) > 0, "the dive wounded a target on the line");
            stage.expect(stage.damageTo(caster) > 0, "the user paid recoil for at least one hit");
            stage.note("俯冲沿一条斜线穿过目标并可能串起第二个人；每穿中一人各按 recoil 反震一次。穿了几人、反震多重取决于俯冲线与站位", {
                casts: stage.casts("bravebird", caster),
                onFirst: Math.round(stage.damageTo(first) * 10) / 10,
                onSecond: Math.round(stage.damageTo(second) * 10) / 10,
                selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
                casterHp: caster.health(),
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                firstAlive: first.alive(),
                secondAlive: second.alive()
            });
            stage.done();
        });
    }, "bravebird dives and the user pays recoil");
});
