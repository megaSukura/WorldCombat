/**
 * 泡沫 / bubble 的可执行设计说明。
 *
 * 场面：只会泡沫的杰尼龟（Squirtle）对两只前后排成一条线、不会还手的铁傀儡（泡群沿同一条线铺过去，
 *   中央那一发能穿过前排糊到后排）。
 * 必然事实：本招被提交过；两个敌人都吃到泡泡。
 * 打滑是约 10% 起的随机结果、级数与时长随特攻／等级／配置变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("bubble", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "squirtle", level: 20, moves: ["bubble"], at: [-4, 0, 0] });
    var near = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    var far = stage.mob({ type: "minecraft:iron_golem", at: [4.3, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..12] run data merge entity @s {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("bubble", caster) > 0 && stage.damageTo(near) > 0 && stage.damageTo(far) > 0;
    }, function () {
        stage.expect(stage.casts("bubble", caster) > 0, "bubble was committed");
        stage.expect(stage.damageTo(near) > 0, "the bubble fan hit the first foe on the line");
        stage.expect(stage.damageTo(far) > 0, "a bubble pierced through and hit the foe behind it");
        stage.note("sudsy is a roughly 10% base roll (bubble.sudsChance); volleys, bubbles per volley, stages and duration follow Speed/Sp. Atk/body and the dense/rapid choice. Each foe takes damage once per cast even if several bubbles touch it", {
            casts: stage.casts("bubble", caster),
            near: Math.round(stage.damageTo(near) * 10) / 10,
            far: Math.round(stage.damageTo(far) * 10) / 10,
            sudsyNear: stage.hadMobEffect(near, "world_combat:status/sudsy"),
            sudsyFar: stage.hadMobEffect(far, "world_combat:status/sudsy")
        });
        stage.done();
    }, "bubble fans out and reaches both foes within 45 s");
});
