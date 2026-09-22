/**
 * 妖精之风 / fairywind —— 可执行设计说明。
 *
 * 一句话：卷起一阵打着旋的香风沿瞄准方向扑出去，穿过一个又一个对手，每个被扫到的挨伤并被甩到一侧。
 *
 * 场面：一只只会妖精之风的皮皮（Clefairy，真实学习者）正对两只排成一列、不会还手的铁傀儡（前 5 格、后 9 格）。
 *   必然事实：本招被提交过、正前方的目标受过伤害。是否穿过并打到后一个、侧甩了多远、刮了几阵都写进 note。
 */
Smoke.scenario("fairywind", function (stage) {
    stage.fill([-10, -1, -8], [12, -1, 8], "minecraft:grass_block");
    stage.fill([-10, 0, -8], [12, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "clefairy", level: 30, moves: ["fairywind"], at: [-3, 0, 0] });
    var near = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    var far = stage.mob({ type: "minecraft:iron_golem", at: [6, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("fairywind", caster) > 0 && stage.damageTo(near) > 0;
    }, function () {
        stage.expect(stage.casts("fairywind", caster) > 0, "clefairy committed fairy wind");
        stage.expect(stage.damageTo(near) > 0, "the swirling wind struck the front golem");
        stage.note("the wind keeps travelling on a pierce hit, so the back golem may take a second hit; the sideways fling and the wide-form rolls are read from the trace", {
            casts: stage.casts("fairywind", caster),
            nearDamage: Math.round(stage.damageTo(near) * 10) / 10,
            farDamage: Math.round(stage.damageTo(far) * 10) / 10
        });
        stage.done();
    }, "fairy wind reaches the front golem within 35 s");
});
