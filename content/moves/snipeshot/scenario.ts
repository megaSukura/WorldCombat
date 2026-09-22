/**
 * 狙击 / snipeshot —— 可执行设计说明。
 *
 * 一句话：施法者锁定一只对手，射出一发追踪的水弹命中并造成伤害。
 *
 * 场面：一只只会狙击的千面避役（inteleon，L45，原生学习者）与两只分列左右的铁傀儡开战，相隔约 6 格；
 *   铁傀儡血厚，用来核对「这一枪锁定单体、造成伤害」。两只敌人在场也顺带覆盖「穿前排直取锁定的那只」。
 *
 * 断言只取必然事实：本招被提交过（`stage.casts`）、至少一只目标挨到伤害（`stage.damageTo`）。
 *   锁定了哪一只、水弹是否穿过别的生物、暴击（原生高暴击）以及屏息形态都是随机或配置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("snipeshot", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "inteleon", level: 45, moves: ["snipeshot"], at: [-4, 0, 0] });
    var left = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, -2] });
    var right = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 2] });
    var startLeft = stage.damageTo(left), startRight = stage.damageTo(right);
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.until(1100, function () {
        return stage.casts("snipeshot", caster) > 0
            && (stage.damageTo(left) > startLeft || stage.damageTo(right) > startRight);
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("snipeshot", caster) > 0, "inteleon committed snipe shot");
            stage.expect(stage.damageTo(left) > startLeft || stage.damageTo(right) > startRight, "the locked shot connected");
            stage.note("which target the crosshair locked, whether the dart passed through the other body, the native high-crit roll and the deadeye form are random/config results", {
                casts: stage.casts("snipeshot", caster),
                leftDamage: Math.round((stage.damageTo(left) - startLeft) * 10) / 10,
                rightDamage: Math.round((stage.damageTo(right) - startRight) * 10) / 10,
                leftAlive: left.alive(), rightAlive: right.alive(), casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "snipe shot marks and hits a foe within 55 s");
});
