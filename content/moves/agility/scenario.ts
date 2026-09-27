/**
 * 高速移动 的可执行设计说明。
 *
 * 场面：一只只会「高速移动」的大比鸟与一只僵尸隔开 9 格、石质场地上开战。技能表里只有这一招，所以 AI 只能先松劲。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/agility 的轻身窗口。
 * 检查有效速度提高，并在清除轻身后验证本招增益撤回、另一次独立速度提升仍保留。
 */
Smoke.scenario("agility", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "pidgeot", level: 34, moves: ["agility"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("agility", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/agility");
    }, function () {
        stage.expect(stage.casts("agility", caster) > 0, "agility was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/agility"), "the rush window carried the shared identity");
        stage.after(60, function () {
            stage.note("agility self-buff applied; the lifecycle checks below inspect effective stages before and after cleansing", {
                casts: stage.casts("agility", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                alive: caster.alive()
            });
            stage.setPp(caster, "agility", 0);
            stage.expect((stage.stages(caster).spe || 0) > 0, "agility raised effective Speed during light-footed");
            stage.boost(caster, { spe: 1 });
            stage.command("effect clear @e[type=cobblemon:pokemon,distance=..40] world_combat:agility_rush");
            stage.after(5, function () {
                stage.expect(!stage.hasMobEffect(caster, "world_combat:status/agility"), "cleansing removes light-footed");
                stage.expect((stage.stages(caster).spe || 0) === 1, "cleansing agility removes only its Speed contribution");
                stage.done();
            });
        });
    }, "agility engages");
});
