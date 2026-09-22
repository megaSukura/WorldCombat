/**
 * 飞叶快刀 / razorleaf —— 可执行设计说明。
 *
 * 一句话：一列叶刃沿着同一条窄带一波波削出去，扫穿排成一列的对手。
 *
 * 场面：一只只会飞叶快刀的大食花（Victreebel，真实学习者，物攻 105）对两只排成一列、沉睡的波波（Pidgey）。
 *   断言只取必然事实：这招被提交过、正前方的目标受过伤害。连发了几波、一条窄带削到几只、是否触发
 *   原生高暴击都写进 note。
 */
Smoke.scenario("razorleaf", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "victreebel", level: 45, moves: ["razorleaf"], at: [-6, 0, 0] });
    var front = stage.pokemon({ species: "pidgey", level: 20, moves: ["tackle"], status: "sleep", at: [1, 0, 0] });
    var back = stage.pokemon({ species: "pidgey", level: 20, moves: ["tackle"], status: "sleep", at: [5, 0, 0] });
    stage.hostile(caster, front);
    stage.hostile(caster, back);
    stage.until(900, function () {
        return stage.casts("razorleaf", caster) >= 1 && stage.damageTo(front) > 0;
    }, function () {
        stage.after(50, function () {
            stage.expect(stage.casts("razorleaf", caster) >= 1, "the caster committed razor leaf");
            stage.expect(stage.damageTo(front) > 0, "the leaf volley cut the foe in front");
            stage.note("how many of the lined-up pidgey the narrow lane reached and whether the native high-crit roll fired are random", {
                casts: stage.casts("razorleaf", caster),
                frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
                backDamage: Math.round(stage.damageTo(back) * 10) / 10
            });
            stage.done();
        });
    }, "razor leaf reaches the front foe within 45 s");
});
