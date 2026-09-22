/**
 * 子弹拳 / bulletpunch 的可执行设计说明。
 *
 * 一句话：一只快速的钢拳手贴身朝两只前后排着、不会动的僵尸打出一发钢拳，把排成一条线的它们打穿。
 *
 * 场面：只会子弹拳的 Scyther（34 级）面对两只被点住（NoAI，不会走开）的僵尸，前排一格、后排两步多，
 *   排在瞄准的同一方向上；设为夜晚，僵尸不会被日光灼烧。AI 只有这一招可用。
 * 必然事实：本招被提交过；至少一个目标受到过伤害。
 *   贯穿到后排几个（速度决定 1～2，穿甲弹最多 3）、打中后被推开多少都写进 note 供读轨迹判断。
 */
Smoke.scenario("bulletpunch", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Scyther", level: 34, moves: ["bulletpunch"], at: [-3, 0, 0] });
    var front = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    var back = stage.mob({ type: "minecraft:zombie", at: [2.2, 0, 0] });
    stage.hostile(caster, front);
    stage.hostile(caster, back);
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..10] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("bulletpunch", caster) > 0 && stage.damageTo(front) + stage.damageTo(back) > 0;
    }, function () {
        stage.expect(stage.casts("bulletpunch", caster) > 0, "bulletpunch was committed");
        stage.expect(stage.damageTo(front) + stage.damageTo(back) > 0, "the steel punch dealt damage");
        stage.note("pierce count follows the user's Speed (1..2) plus the armour-piercing choice; the two zombies are points on the same line, so how many of them were punched through depends on the align-up and is read from the trace.", {
            casts: stage.casts("bulletpunch", caster),
            frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
            backDamage: Math.round(stage.damageTo(back) * 10) / 10,
            casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "bulletpunch punches a line of stationary foes");
});
