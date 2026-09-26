/**
 * 庆祝 / celebrate 的可执行设计说明。
 *
 * 场面：一只只会「庆祝」的伊布、一位站得很近的队友僵尸（同队），以及 16 格外一只敌对的僵尸。
 *   技能表里只有这一招；队伍短暂安全（敌人还在安全距离外）、身边有队友，AI 会先开一场庆祝。
 * 必然事实：本招被提交过；施法者与近旁队友都带上了共享身份 world_combat:status/celebrate；
 *   默认助兴式给队友挂上短暂的行进劲，队友的移动速度属性确实被抬高。
 * 助兴为何会「受击即退」、慰劳式按已失生命补多少，写进 note 供读轨迹判断（本场无人受伤）。
 */
Smoke.scenario("celebrate", function (stage) {
    stage.fill([-12, -1, -8], [20, -1, 8], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "eevee", level: 30, moves: ["celebrate"], at: [0, 0, 0] });
    var ally = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [16, 0, 0] });
    stage.team("partying", [caster, ally]);
    stage.hostile(caster, foe);
    var baseAllySpeed = stage.attribute(ally, "minecraft:generic.movement_speed");
    stage.until(900, function () {
        return stage.casts("celebrate", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/celebrate")
            && stage.hadMobEffect(ally, "world_combat:status/celebrate");
    }, function () {
        stage.expect(stage.casts("celebrate", caster) > 0, "celebrate was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/celebrate"), "the caster carried the shared celebrate identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/celebrate"), "the nearby ally was caught by the party");
        stage.after(4, function () {
            stage.expect(stage.attribute(ally, "minecraft:generic.movement_speed") > baseAllySpeed + 0.001,
                "the cheer travel burst raised the ally's movement speed");
            stage.note("the travel burst is brief and a hit ends it early; the treat form heals by missing health instead. "
                + "Neither is a necessary fact in this quiet arena", {
                casts: stage.casts("celebrate", caster),
                allyCaught: stage.hadMobEffect(ally, "world_combat:status/celebrate"),
                allySpeed: [baseAllySpeed, Math.round(stage.attribute(ally, "minecraft:generic.movement_speed") * 1000) / 1000],
                casterAlive: caster.alive(),
                foeHp: Math.round(foe.health() * 10) / 10
            });
            stage.done();
        });
    }, "celebrate fires with an ally nearby before the foe closes in");
});
