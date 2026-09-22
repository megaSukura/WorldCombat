/**
 * 摔打 / slam —— 可执行设计说明。
 *
 * 场面：一只只会摔打的精灵对一只 NoAI 的铁傀儡——目标站住不动，砸点扬起后不会跑掉，
 * 用来核对「砸点固定 + 落下结算」。夜晚、晴天，伤害只可能来自这一砸。
 * 必然事实：本招被提交过；目标受到过伤害（砸点里有人）。
 * 暴击、砸中几跳、沉砸式与疾砸式的时序差异写进 note 供读轨迹判断。
 */
Smoke.scenario("slam", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "Snorlax", level: 40, moves: ["slam"], at: [0, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [2.4, 0, 0] });
    stage.hostile(caster, heavy);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("slam", caster) >= 1 && stage.damageTo(heavy) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("slam", caster) >= 1, "slam was committed");
            stage.expect(stage.damageTo(heavy) > 0, "the slam dealt damage");
            stage.note("the crit roll and how many times the crater caught the golem are random", {
                casts: stage.casts("slam", caster),
                damage: Math.round(stage.damageTo(heavy) * 10) / 10,
                heavyAlive: heavy.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "slam lands on a stationary target");
});
