/**
 * 冰锤 / icehammer 的可执行设计说明。
 *
 * 场面：只会冰锤的好胜毛蟹（Crabominable 42 级，重、物攻高）对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子），
 *   相隔 2 格。AI 只有这一招可用。
 * 必然事实：本招被提交过、目标受过伤害、目标带上共享身份 world_combat:status/chilled、
 *   落点地面结出冰。
 * 命中/暴击、对已冰缓目标的加成、冰面半径与时长都写进 note 供读轨迹判断。
 */
Smoke.scenario("icehammer", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "crabominable", level: 42, moves: ["icehammer"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(1000, function () {
        return stage.casts("icehammer", caster) > 0 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/chilled");
    }, function () {
        stage.after(20, function () {
            var changed = stage.changedBlocks();
            stage.expect(stage.casts("icehammer", caster) > 0, "icehammer was committed");
            stage.expect(stage.damageTo(foe) > 0, "the ice hammer blew landed on the foe");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/chilled"), "the foe carries the shared chilled identity");
            stage.expect(changed.some(function (b) { return b.after === "minecraft:ice"; }), "the impact froze the ground into ice");
            stage.note("icehammer observations", {
                casts: stage.casts("icehammer", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(foe) * 10) / 10,
                changed: changed
            });
            stage.done();
        });
    }, "icehammer blows, chills and freezes the ground within 50 s");
});
