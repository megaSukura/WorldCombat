/**
 * 空气利刃 / aircutter —— 可执行设计说明。
 *
 * 一句话：施法者一次张开一片细风刃，扫过面前扇区、同时切中多个对手。
 *
 * 场面：一只只会空气利刃的音波龙（Noivern，真实学习者，特攻 97／速度 123）对三只沉睡的波波（Pidgey，
 *   排成一个浅弧、都在身前扇面内）。断言只取必然事实：这招被提交过、正前方的目标受过伤害。
 * 一次张开切中几只、是否触发原生的高暴击都带随机，写进 note。
 */
Smoke.scenario("aircutter", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "noivern", level: 45, moves: ["aircutter"], at: [-6, 0, 0] });
    var front = stage.pokemon({ species: "pidgey", level: 20, moves: ["tackle"], status: "sleep", at: [2, 0, 0] });
    var left = stage.pokemon({ species: "pidgey", level: 20, moves: ["tackle"], status: "sleep", at: [1, 0, -2] });
    var right = stage.pokemon({ species: "pidgey", level: 20, moves: ["tackle"], status: "sleep", at: [1, 0, 2] });
    stage.hostile(caster, front);
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.until(900, function () {
        return stage.casts("aircutter", caster) >= 1 && stage.damageTo(front) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("aircutter", caster) >= 1, "the caster committed air cutter");
            stage.expect(stage.damageTo(front) > 0, "the wind blades cut the foe in front");
            stage.note("how many of the three sleeping pidgey the fan reached and whether the native high-crit roll fired are random", {
                casts: stage.casts("aircutter", caster),
                frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
                leftDamage: Math.round(stage.damageTo(left) * 10) / 10,
                rightDamage: Math.round(stage.damageTo(right) * 10) / 10
            });
            stage.done();
        });
    }, "air cutter reaches the front foe within 45 s");
});
