// 大愤慨的可执行设计说明：一只只会大愤慨的炽焰咆哮虎对一只被点住、不会还手的僵尸（夜里，避免日晒自燃）。
// 必然事实：本招被提交过；僵尸受到过伤害（火舌烧穿）；施法者身上出现过共享身份 confusion——
//   喷完自己陷入恍惚是这一招固定的结局。喷了几口、是否点着、触地余火写进 note 供读轨迹判断。
Smoke.scenario("ragingfury", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "incineroar", level: 42, moves: ["ragingfury"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..8,limit=1] {NoAI:1b,attributes:[{id:\"minecraft:generic.max_health\",base:320}],Health:320f}");
    stage.until(1200, function () {
        return stage.casts("ragingfury", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(180, function () {
            stage.expect(stage.casts("ragingfury", caster) > 0, "ragingfury was committed");
            stage.expect(stage.damageTo(foe) > 0, "the flame charge damaged the foe");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/confusion"), "the user ended the rampage confused");
            stage.note("大愤慨沿当刻瞄准喷 2~3 口火舌：每口从嘴端推进、遇墙截断，火束里的敌人被烧中、点着并推开；只有实际扫过的可支撑地面留下细短余火（world_combat:ragingfury/ember，同源重叠合并）；喷完自己恍惚（共享身份 confusion）", {
                casts: stage.casts("ragingfury", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                confused: stage.hadMobEffect(caster, "world_combat:status/confusion"),
                foeAlive: foe.alive(),
                moved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "raging fury charges");
});
