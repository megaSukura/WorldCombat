/**
 * 飞叶快刀 / razorleaf —— 可执行设计说明。
 *
 * 一句话：一列叶幕沿着同一条窄带真实向前推进，削穿排成一列的对手，撞墙后段被截断。
 *
 * 场面：一只只会飞叶快刀的大食花（Victreebel，真实学习者，物攻 105）对两只排成一列、沉睡的波波（Pidgey）：
 *   近处一只、墙后一只。断言只取必然事实：这招被提交过、正前方的目标受过伤害、墙后的目标没被隔墙削到。
 *   连发了几波、一波削到几只、是否触发原生高暴击都写进 note。
 */
Smoke.scenario("razorleaf", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.block([2, 0, 0], "minecraft:stone");
    stage.block([2, 1, 0], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "victreebel", level: 45, moves: ["razorleaf"], at: [-4, 0, 0] });
    var front = stage.pokemon({ species: "pidgey", level: 20, moves: ["tackle"], status: "sleep", at: [0, 0, 0] });
    var behind = stage.pokemon({ species: "pidgey", level: 20, moves: ["tackle"], status: "sleep", at: [5, 0, 0] });
    stage.hostile(caster, front);
    stage.hostile(caster, behind);
    stage.until(900, function () {
        return stage.casts("razorleaf", caster) >= 1 && stage.damageTo(front) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("razorleaf", caster) >= 1, "the caster committed razor leaf");
            stage.expect(stage.damageTo(front) > 0, "the advancing leaf curtain cut the foe in front");
            stage.expect(stage.damageTo(behind) === 0, "the wall truncated the wave before the foe behind it");
            stage.note("每波叶幕按实际位移推进；墙后目标是否被后段扫到、削中几只、原生高暴击都为观测。", {
                casts: stage.casts("razorleaf", caster),
                frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
                behindDamage: Math.round(stage.damageTo(behind) * 10) / 10
            });
            stage.done();
        });
    }, "razor leaf reaches the front foe within 45 s");
});
