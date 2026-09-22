/**
 * 真气拳 / focuspunch —— 可执行设计说明。
 *
 * 一句话：站定收势、把气收进拳里，收满后踏进打出极重的一拳。
 *
 * 场面：一只只带「真气拳」的怪力（40 级）对一只不会动手的卡比兽（45 级，技能表里放着没有实现的「跃起」，
 *   因此不会还手、也基本站定）。这段长收势能聚满，正是要验证的「安静环境下打出极重一拳」；
 *   「聚气期间被外来伤害打断」是本招的另一条分支，需要会还手的对手与时机，写进 note，不在断言里赌。
 * 必然事实：真气拳被提交过、目标受到过伤害。
 *   收势的实际刻数、是否踏空与具体伤害值随时间与走位变化，写进 note。
 */
Smoke.scenario("focuspunch", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "machoke", level: 40, moves: ["focuspunch"], at: [-2, 0, 0], properties: "nature=adamant" });
    const foe = stage.pokemon({ species: "snorlax", level: 45, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("focuspunch", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("focuspunch", caster) >= 1, "machoke committed focus punch");
        stage.expect(stage.damageTo(foe) > 0, "the gathered punch dealt damage");
        stage.note("a calm, non-attacking foe lets the long gather finish; against an attacker, any external damage during the gather interrupts the instance and the punch never commits (the break hook on damage_applied). Whether this run whiffed past the target is timing.", {
            casts: stage.casts("focuspunch", caster),
            dealt: Math.round(stage.damageBy(caster) * 10) / 10,
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(caster) * 10) / 10,
            foeAlive: foe.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "focus punch lands on the passive foe");
});
