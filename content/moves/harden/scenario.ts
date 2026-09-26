/**
 * 变硬 的可执行设计说明。
 *
 * 场面：一只只会「变硬」的铁甲蛹（20 级）与一只僵尸隔开 4 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先结晶。僵尸是普通拳击，单次不够重，晶壳应当稳住并磨掉一部分伤害。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/harden 的晶壳窗口。
 *   削掉多少、有没有被一记重击打裂（僵尸的拳头够不够过 crack 阈值）写进 note 供读轨迹判断。
 */
Smoke.scenario("harden", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "metapod", level: 20, moves: ["harden"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("harden", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/harden");
    }, function () {
        stage.expect(stage.casts("harden", caster) > 0, "harden was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/harden"), "the crystal shell carried the shared identity");
        stage.after(60, function () {
            stage.note("each incoming hit loses the defence-derived fraction and the crack presentation sits on the real contact side, its shards growing as the hit nears the toughness threshold; a zombie's punch usually stays under the threshold, so the window holds its full length here and the shell only shatters (with no leftover Defence window) once it is reached, expires or is cleansed.", {
                casts: stage.casts("harden", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.done();
        });
    }, "harden engages");
});
