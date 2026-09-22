/**
 * 摇晃舞 / teeterdance 的可执行设计说明。
 *
 * 场面：一只只会「摇晃舞」的噗噗猪与一只僵尸隔开约 7 格开战。技能表里只有这一招，所以 AI 只能起舞；
 *   它没有攻击手段，会以「控制」的身份先走近到舞圈半径以内再放。
 * 必然事实：本招被提交过；僵尸带上了共享身份 world_combat:status/confusion。
 * 摇晃走位的每步位移、失手概率、顾友／尽兴哪一档，连同被晃到的人数一起写进 note 供读轨迹判断。
 */
Smoke.scenario("teeterdance", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "grumpig", level: 30, moves: ["teeterdance"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("teeterdance", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/confusion");
    }, function () {
        stage.expect(stage.casts("teeterdance", caster) > 0, "teeter dance was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/confusion"), "the foe carried the shared confusion identity");
        stage.note("the ongoing stagger, the fumble roll and the considerate/all-out form are design facts read here", {
            casts: stage.casts("teeterdance", caster),
            foeDazed: stage.hasMobEffect(foe, "world_combat:status/confusion"),
            casterHurt: Math.round(stage.damageTo(caster) * 10) / 10,
            foeHurt: Math.round(stage.damageTo(foe) * 10) / 10
        });
        stage.done();
    }, "teeter dance catches the approaching foe");
});
