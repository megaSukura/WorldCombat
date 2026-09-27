/**
 * 仆刀 / kowtowcleave —— 可执行设计说明。
 *
 * 一句话：先跪拜诱敌（目标真的朝自己逼近或出手才上钩），再欺身一刀；刀落在第一个真实碰到的身体上，上钩的人才吃加成。
 *
 * 场面：一只仆刀将军对一只三格外的对手（留出逼近/出手的空间）；场地铺平，夜晚避免日光环境伤害干扰读数。
 * 断言只取必然事实：这招被提交过、目标受过仆刀伤害、且目标没有被前置降防（不再留通用空门标记）。
 * 是否真的在劈砍那一刻上钩、暴击与击退写进 note。
 */
Smoke.scenario("kowtowcleave", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "kingambit", level: 42, moves: ["kowtowcleave"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "raticate", level: 30, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("kowtowcleave", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("kowtowcleave", caster) >= 1, "caster committed kowtow cleave");
            stage.expect(stage.damageTo(foe) > 0, "kowtow cleave dealt damage to the foe");
            stage.expect((stage.stages(foe).def || 0) >= 0, "no pre-emptive Defence drop is applied to the foe");
            stage.note("whether the bait hooked at the cut, plus crit and knockback, are positional/random", {
                casts: stage.casts("kowtowcleave", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                defStage: stage.stages(foe).def || 0,
                movedBy: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "kowtow cleave lands within 60 s");
});
