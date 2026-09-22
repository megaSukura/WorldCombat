/**
 * 起风 / gust —— 可执行设计说明。
 *
 * 一句话：振翅扇出一记短促的压缩风弹，命中就把目标沿风的方向推开；正离地的目标被吹得更远。
 *
 * 场面：只会起风的大比鸟（35 级）站在一只被点住、不会还手的铁傀儡（耐打靶子）前 6 格，站在草地上；
 *   风弹会小幅追踪，几乎不会落空。
 * 必然事实：本招被提交过、目标受过伤害。推开距离、是否把目标吹得更远只写进 note，供读轨迹判断。
 */
Smoke.scenario("gust", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "pidgeot", level: 35, moves: ["gust"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("gust", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("gust", caster) > 0, "pidgeot committed gust");
        stage.expect(stage.damageTo(foe) > 0, "the wind puff dealt damage to the foe");
        stage.note("push follows Special Attack and the shove choice; an airborne target is blown 1.8x farther and lifted, but the grounded iron golem only takes the base push", {
            casts: stage.casts("gust", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            foeAlive: foe.alive()
        });
        stage.done();
    }, "gust commits and lands within 35 s");
});
