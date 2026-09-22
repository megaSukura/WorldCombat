// 逆鳞的可执行设计说明：一只只会逆鳞的快龙对一只被点住、不会还手的僵尸。
// 必然事实：本招被提交过；僵尸受到过伤害（至少一次冲撞撞实）；施法者身上出现过共享身份 confusion——
//   大闹之后自己陷入恍惚是这一招固定的结局。连撞几次、命中率、是否出现终结撞写进 note 供读轨迹判断。
Smoke.scenario("outrage", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "dragonite", level: 42, moves: ["outrage"], at: [-2.5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..8,limit=1] {NoAI:1b,attributes:[{id:\"minecraft:generic.max_health\",base:300}],Health:300f}");
    stage.until(1200, function () {
        return stage.casts("outrage", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(160, function () {
            stage.expect(stage.casts("outrage", caster) > 0, "outrage was committed");
            stage.expect(stage.damageTo(foe) > 0, "the charges dealt damage to the foe");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/confusion"), "the user ended the rampage confused");
            stage.note("逆鳞锁定一个对手、连撞 2~3 次并把目标顶开，最后一撞乘终结倍率，撞完自己陷入恍惚（共享身份 confusion）；具体次数、命中与终止情况取决于数据与站位", {
                casts: stage.casts("outrage", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                selfDamage: Math.round(stage.damageTo(caster) * 10) / 10,
                confused: stage.hadMobEffect(caster, "world_combat:status/confusion"),
                moved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "outrage rampages");
});
