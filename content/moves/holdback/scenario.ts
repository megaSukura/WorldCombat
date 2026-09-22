/**
 * 手下留情 / holdback —— 可执行设计说明。
 *
 * 一句话：朝身前扇形扫出一记收着力气的横扫，扇面里的目标都只会削血，至少留下 1 HP。
 *
 * 场面：一只只会手下留情的猫鼬斩（40 级）对两只被点住、已被预先打到低血的铁傀儡——这一扫若不留手，两只都会被扫倒。
 * 断言只取必然事实：这招被提交过、两只目标在挨扫后都还活着。扇面实际扫中几只、各自剩多少血写进 note。
 */
Smoke.scenario("holdback", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "zangoose", level: 40, moves: ["holdback"], at: [-3, 0, 0] });
    var near = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, -0.7] });
    var side = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0.7] });
    stage.hostile(caster, near);
    stage.hostile(caster, side);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..9] run data merge entity @s {NoAI:1b}");
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..9] run damage @s 92 minecraft:generic");
    stage.until(600, function () {
        return stage.casts("holdback", caster) >= 1 && stage.damageTo(near) + stage.damageTo(side) > 0;
    }, function () {
        stage.expect(stage.casts("holdback", caster) >= 1, "caster committed holdback");
        stage.expect(stage.damageTo(near) + stage.damageTo(side) > 0, "holdback dealt damage to the fan");
        stage.expect(near.alive() && side.alive(), "the sparing sweep left both targets standing");
        stage.note("both targets are pre-damaged to ~8 HP; the mercy intercept caps every hit so neither is knocked out", {
            casts: stage.casts("holdback", caster),
            damageNear: Math.round(stage.damageTo(near) * 10) / 10,
            damageSide: Math.round(stage.damageTo(side) * 10) / 10,
            nearAlive: near.alive(),
            sideAlive: side.alive()
        });
        stage.done();
    }, "holdback cast within 30 s");
});
