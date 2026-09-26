/**
 * 冰球 / iceball —— 可执行设计说明。
 *
 * 一句话：蜷身沿瞄准直直推出一串越冻越大的冰球，每真实命中一发冻厚一层、下一发更重，最后碎开留下冰面。
 *
 * 场面：一只只会冰球的冰宝（40 级，原生真实学习者之一）对一只被点住、不会还手的铁傀儡（厚血大体型靶子）。
 * 断言只取必然事实：这招被提交过（`stage.casts`）、目标受过伤害。实际推了几发、是否每发都接上、
 * 有没有在窄处撞框提前碎、碎开有没有冻住地面，都写进 note 供读轨迹判断。
 */
Smoke.scenario("iceball", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "bergmite", level: 40, moves: ["iceball"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(1200, function () {
        return stage.casts("iceball", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("iceball", caster) >= 1, "caster committed ice ball");
            stage.expect(stage.damageTo(foe) > 0, "ice ball dealt damage to the foe");
            stage.note("each real hit grows the next ball by ramp (2x by default) and its radius by girth; a whiff, frame hit or refused hit shatters the ball where it really stopped instead of looping back, and the caster stays rooted for the whole sequence. The ice patch is a real terrain lease that stage.changedBlocks() cannot see from here.", {
                casts: stage.casts("iceball", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "ice ball lands within 60 s");
});
