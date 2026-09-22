/**
 * 庆祝 / celebrate 的可执行设计说明。
 *
 * 场面：一只只会「庆祝」的伊布、一位站得很近的队友僵尸（同队），以及 9 格外一只敌对的僵尸。
 *   技能表里只有这一招；身边有队友、威胁在考虑距离内，AI 会先开一场庆祝。
 * 必然事实：本招被提交过；施法者自己带上了共享身份 world_combat:status/celebrate。
 * 队友是否被一起感染、助兴／慰劳哪个方向、速度属性有没有变，写进 note 供读轨迹判断。
 */
Smoke.scenario("celebrate", function (stage) {
    stage.fill([-12, -1, -8], [14, -1, 8], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "eevee", level: 30, moves: ["celebrate"], at: [0, 0, 0] });
    var ally = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.team("partying", [caster, ally]);
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("celebrate", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/celebrate");
    }, function () {
        stage.expect(stage.casts("celebrate", caster) > 0, "celebrate was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/celebrate"), "the caster carried the shared celebrate identity");
        stage.note("whether the ally was caught, and the actual Speed stage, depend on timing and on the chosen form; "
            + "the private assembly has no reader for a Pokemon's native Speed stage", {
            casts: stage.casts("celebrate", caster),
            allyCaught: stage.hadMobEffect(ally, "world_combat:status/celebrate"),
            allySpeed: Math.round(stage.attribute(ally, "minecraft:generic.movement_speed") * 1000) / 1000,
            casterAlive: caster.alive(),
            foeHp: Math.round(foe.health() * 10) / 10
        });
        stage.done();
    }, "celebrate fires with an ally nearby");
});
