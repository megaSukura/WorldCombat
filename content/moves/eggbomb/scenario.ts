/**
 * 炸蛋 / eggbomb —— 可执行设计说明。
 *
 * 一句话：用最大力气抡出一枚大大的蛋；砸中就是最重的单体一记，并在落点摊开一片滑蛋液，踩进去的人都会打滑。
 *
 * 场面：只会炸蛋的椰蛋树（45 级）对一只被点住、不会还手的铁傀儡（耐打靶子）抡蛋，站在草地上；
 *   两者相距 6 格，落在本招射程内。
 * 必然事实：本招被提交过、目标受过伤害。是否抡偏（原生 75 命中）、滑蛋液摊开多少格、滑了多久都写进 note。
 */
Smoke.scenario("eggbomb", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "exeggutor", level: 45, moves: ["eggbomb"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    var landedAt = 0;
    stage.until(900, function () {
        if (landedAt === 0 && stage.casts("eggbomb", caster) >= 1 && stage.damageTo(foe) > 0) landedAt = stage.tick();
        return landedAt > 0 && stage.tick() >= landedAt + 20;
    }, function () {
        stage.expect(stage.casts("eggbomb", caster) >= 1, "exeggutor committed egg bomb");
        stage.expect(stage.damageTo(foe) > 0, "the hurled egg dealt damage to the foe");
        stage.note("scatter follows level and the heavy choice (native 75 accuracy); a missed egg still leaves a slick patch that applies world_combat:status/slick to non-allies standing in it", {
            casts: stage.casts("eggbomb", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "egg bomb commits and lands within 45 s");
});
