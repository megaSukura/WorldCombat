/**
 * 毒尾 / poisontail —— 可执行设计说明。
 *
 * 一句话：一只只会毒尾的阿利多斯（ariados，L35，原生学习者）低身把尾巴贴地抡过半圈，扫中近身的目标并可能抹毒。
 *
 * 场面：两只被点住（NoAI，不会走开）的铁傀儡分别站在正面与斜侧，都在扫击弧面里；耐打的靶子让这一扫的
 *   弧面判定稳定，也看得清正对目标吃满、顺带扫到的目标吃折扣。地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；正对的目标受到过扫击伤害（`stage.damageTo`）。
 * 中毒概率（越靠尾梢越高）、暴击、以及副目标被扫到多少都是随机的，写进 note 供读轨迹判断。
 */
Smoke.scenario("poisontail", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "ariados", level: 35, moves: ["poisontail"], at: [-2, 0, 0] });
    var front = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    var side = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 2] });
    stage.hostile(caster, front);
    stage.hostile(caster, side);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..12] run data merge entity @s {NoAI:1b}");
    stage.until(1400, function () {
        return stage.casts("poisontail", caster) >= 1 && stage.damageTo(front) > 0;
    }, function () {
        stage.after(50, function () {
            stage.expect(stage.casts("poisontail", caster) >= 1, "the caster committed poison tail");
            stage.expect(stage.damageTo(front) > 0, "poison tail dealt damage to the front foe");
            stage.note("poison is a roll that rises toward the tail tip; crit, the shove and whether the side foe is swept too are variable", {
                casts: stage.casts("poisontail", caster),
                frontDamage: Math.round(stage.damageTo(front) * 10) / 10,
                sideDamage: Math.round(stage.damageTo(side) * 10) / 10,
                frontPoisoned: stage.hadMobEffect(front, "world_combat:status/poison"),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "poison tail sweeps a foe within 70 s");
});
