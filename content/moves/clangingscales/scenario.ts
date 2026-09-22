/**
 * 鳞片噪音 / clangingscales 的可执行设计说明。
 *
 * 场面：只会鳞片噪音的龙系精灵（Kommo-o 50 级）被两只被点住、不会还手的铁傀儡围住（相隔 2 格），
 *   AI 只有这一招可用，`minFoes` 默认 2 正好凑齐。必然事实：本招被提交过、至少一名目标受过伤害。
 * 波及半径、威力、震退距离与自降防级数、回响式是否再荡一圈，都写进 note 供读轨迹判断。
 */
Smoke.scenario("clangingscales", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "kommoo", level: 50, moves: ["clangingscales"], at: [0, 0, 0] });
    var first = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    var second = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 3] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("clangingscales", caster) > 0 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0);
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("clangingscales", caster) > 0, "clangingscales was committed");
            stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "the ring of sound damaged at least one foe");
            stage.note("the ring radius, per-target falloff and knock-back follow Special Attack/height/level and target weight; after the ring the user loses guardLoss Defense stages (native 1, echo form 2), and the echo form rings a second time after echoDelay (design facts verified in the full assembly)", {
                casts: stage.casts("clangingscales", caster),
                firstDamage: Math.round(stage.damageTo(first) * 10) / 10,
                secondDamage: Math.round(stage.damageTo(second) * 10) / 10,
                ownHurt: Math.round(stage.damageTo(caster) * 10) / 10
            });
            stage.done();
        });
    }, "clangingscales commits and its ring lands within 45 s");
});
