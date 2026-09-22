/**
 * 镜光射击 / mirrorshot 的可执行设计说明。
 *
 * 场面：只会镜光射击的磁怪（Magnemite）站在远处，对十格开外、不会还手的铁傀儡射光。
 * 必然事实：本招被提交过；对手受到过镜光伤害。
 * 晃眼是约 30% 的随机结果（本单元 glareChance）、级数与时长随特攻／等级／配置变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("mirrorshot", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magnemite", level: 26, moves: ["mirrorshot"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..14] run data merge entity @s {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("mirrorshot", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("mirrorshot", caster) > 0, "mirrorshot was committed");
        stage.expect(stage.damageTo(foe) > 0, "the light lance hit the foe");
        stage.note("the glare is a roughly 30% base roll (mirrorshot.glareChance); stages, duration and the scatter reflect follow Sp. Atk/level/body and the focused/scatter choice", {
            casts: stage.casts("mirrorshot", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            glared: stage.hadMobEffect(foe, "world_combat:status/glared"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "mirrorshot fires and lands within 45 s");
});
