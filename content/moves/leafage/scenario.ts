/**
 * 树叶 / leafage —— 可执行设计说明。
 *
 * 一句话：抖下一把嫩叶，沿瞄准方向张成小扇面撒出去，最先扎中的那一片造成伤害。
 *
 * 场面：一只只会树叶的木木枭（Rowlet，真实学习者）站在一只被点住、不会还手的铁傀儡前 4 格。
 *   必然事实：本招被提交过、目标受过伤害。撒了几片、有几片落在别处、是否被扇面兜住都写进 note。
 */
Smoke.scenario("leafage", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "rowlet", level: 20, moves: ["leafage"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("leafage", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("leafage", caster) > 0, "rowlet committed leafage");
        stage.expect(stage.damageTo(foe) > 0, "the tossed leaves dealt damage to the foe");
        stage.note("how many of the fanned leaves landed, whether the fan caught the walking golem, and the heavy-form roll are read from the trace", {
            casts: stage.casts("leafage", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "leafage lands on the foe within 35 s");
});
