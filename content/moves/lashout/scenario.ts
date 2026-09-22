/**
 * 泄愤 / lashout —— 可执行设计说明。
 *
 * 一句话：把被削弱的怒气朝目标一次喷出；自身任一项能力等级为负时翻倍，命中后消掉负等级。
 *
 * 场面：一只物攻手贴到三格外对一只低等级对手，只带这一招；平地、夜晚，避免日光与地形干扰读数。
 * 断言只取必然事实：这招被提交过、目标受过伤害。翻倍与宣泄都要求施法者先被削弱，本场不保证发生，
 * 写进 note 供读轨迹判断。
 */
Smoke.scenario("lashout", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "scrafty", level: 48, moves: ["lashout"], at: [-2, 0, 0], properties: "nature=adamant" });
    const target = stage.pokemon({ species: "raticate", level: 25, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.until(600, function () { return stage.casts("lashout", caster) >= 1 && stage.damageTo(target) > 0; }, function () {
        stage.expect(stage.casts("lashout", caster) >= 1, "scrafty committed lash out");
        stage.expect(stage.damageTo(target) > 0, "the vented blow dealt damage");
        stage.note("the doubling needs a negative stage on the caster at impact (a debuff landing first), which this duel does not guarantee", {
            casts: stage.casts("lashout", caster),
            dealt: Math.round(stage.damageBy(caster) * 10) / 10,
            targetDamage: Math.round(stage.damageTo(target) * 10) / 10,
            casterAttack: Math.round(stage.attribute(caster, "minecraft:generic.attack_damage") * 100) / 100,
            tick: stage.tick()
        });
        stage.done();
    }, "lash out lands on the target within 30 s");
});
