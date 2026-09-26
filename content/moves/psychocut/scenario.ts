/**
 * 精神利刃 / psychocut —— 可执行设计说明。
 *
 * 一句话：把实体化的心之刃掷出去，刃拐着弯追向目标，命中处切出一个十字并波及近旁的敌人。
 *
 * 场面：一只只会精神利刃的胡地（45 级）对一只被点住、不会还手的铁傀儡。
 * 断言只取必然事实：这招被提交过、目标受过伤害。暴击、十字波及到几个额外目标都带随机与时序，写进 note。
 */
Smoke.scenario("psychocut", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "alakazam", level: 45, moves: ["psychocut"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(600, function () {
        return stage.casts("psychocut", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("psychocut", caster) >= 1, "caster committed psycho cut");
        stage.expect(stage.damageTo(foe) > 0, "psycho cut dealt damage to the foe");
        stage.note("critical hits come from the native critRatio 2 roll; the cross is built from the blade's actual incoming direction and only foes lying on its two traced strokes take the echo, so this single-target stage sees no extra victim", {
            casts: stage.casts("psychocut", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "psycho cut lands within 30 s");
});
