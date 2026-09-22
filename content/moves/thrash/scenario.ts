// 大闹一番的可执行设计说明：一只只会大闹一番的火爆猴被两只贴身僵尸围住。
// 必然事实：本招被提交过；至少一只僵尸受到过伤害（乱挥罩住一圈）；施法者身上出现过共享身份 confusion——
//   大闹完自己陷入恍惚是这一招固定的结局。连挥几次、罩住几只、是否磕伤自己写进 note 供读轨迹判断。
Smoke.scenario("thrash", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "primeape", level: 40, moves: ["thrash"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [2.4, 0, 0.5] });
    var foeB = stage.mob({ type: "minecraft:zombie", at: [-1.6, 0, 1.8] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.command("execute as @e[type=minecraft:zombie,distance=..12] run data merge entity @s {NoAI:1b,attributes:[{id:\"minecraft:generic.max_health\",base:260}],Health:260f}");
    stage.until(1200, function () {
        return stage.casts("thrash", caster) > 0 && stage.damageTo(foeA) > 0;
    }, function () {
        stage.after(160, function () {
            stage.expect(stage.casts("thrash", caster) > 0, "thrash was committed");
            stage.expect(stage.damageTo(foeA) > 0, "the flailing damaged a foe");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/confusion"), "the user ended the rampage confused");
            stage.note("大闹一番原地乱挥 2~3 次，每一挥罩住一圈敌人并朝外震开，最后一记重跺；闹完自己恍惚（共享身份 confusion）；狂乱式下每挥还会磕伤自己", {
                casts: stage.casts("thrash", caster),
                onA: Math.round(stage.damageTo(foeA) * 10) / 10,
                onB: Math.round(stage.damageTo(foeB) * 10) / 10,
                selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
                confused: stage.hadMobEffect(caster, "world_combat:status/confusion"),
                moved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "thrash flails around");
});
