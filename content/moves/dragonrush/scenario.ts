/**
 * 龙之俯冲 / dragonrush —— 可执行设计说明。
 *
 * 一句话：先把杀气铺成一圈威压，再从高处俯冲砸在锁定点上；被杀气压住的人更容易被撞懵。
 *
 * 场面：一只只会龙之俯冲的尖牙陆鲨（45 级）对两只被点住的僵尸（3 格外，NoAI、高血量）。
 * 必然事实：本招被提交过、有敌人受到过伤害（俯冲砸中）。
 * 命中率、落点罩住几只、暴击、畏缩是否掷出都是概率/位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragonrush", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gabite", level: 45, moves: ["dragonrush"], at: [-1, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    var side = stage.mob({ type: "minecraft:zombie", at: [3, 0, 2] });
    stage.hostile(caster, foe);
    stage.hostile(caster, side);
    stage.command("execute as @e[type=minecraft:zombie,distance=..10] run data merge entity @s {NoAI:1b,attributes:[{id:\"minecraft:generic.max_health\",base:260}],Health:260f}");
    stage.until(1200, function () {
        return stage.casts("dragonrush", caster) >= 1 && (stage.damageTo(foe) > 0 || stage.damageTo(side) > 0);
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("dragonrush", caster) >= 1, "caster committed dragonrush");
            stage.expect(stage.damageTo(foe) + stage.damageTo(side) > 0, "the dive dealt damage");
            stage.note("the 75%-style hit roll, how many bodies the landing ring covered and whether the 20% flinch rolled are random/positional", {
                casts: stage.casts("dragonrush", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                onSide: Math.round(stage.damageTo(side) * 10) / 10,
                flinchedFoe: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                flinchedSide: stage.hadMobEffect(side, "world_combat:status/flinch"),
                moved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "dragonrush lands within 60 s");
});
