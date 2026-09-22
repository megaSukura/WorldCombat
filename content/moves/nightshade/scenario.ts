/**
 * 黑夜魔影的可执行设计说明。
 *
 * 场面：一只只会黑夜魔影的精灵（催眠貘，30 级，地面行走不吃浮空的影响）面对 5 格外一只学不会任何招式、
 * 只当沙包的精灵（果然翁，30 级）。幻影自己会追向目标，所以即使目标在走也能命中；伤害恒等于等级。
 * 必然事实：本招被提交过；对面受到过伤害。
 * 飞行途中被墙截断、幻影是否被目标走开躲过、伤害具体数值都不写断言，写进 note 供读轨迹判断。
 */
Smoke.scenario("nightshade", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "drowzee", level: 30, moves: ["nightshade"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "wobbuffet", level: 30, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("nightshade", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("nightshade", caster) > 0, "drowzee committed night shade");
            stage.expect(stage.damageTo(foe) > 0, "the phantom dealt level damage at range");
            stage.note("night shade deals the user's level (30) times a special-attack factor, ignoring defence; the phantom homes so a walking target is still caught. Variable: flight path, whether a wall interrupts it, and the damage roll.", {
                casts: stage.casts("nightshade", caster),
                damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive(), foeHealth: Math.round(foe.health() * 10) / 10,
                casterHealth: Math.round(caster.health() * 10) / 10
            });
            stage.done();
        });
    }, "night shade is cast and lands within 45 s");
});
