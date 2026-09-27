/**
 * 磨爪 / honeclaws 的可执行设计说明。
 *
 * 场面：一只只会「磨爪」的狃拉与一只弱小的小拉达隔开 10 格、石质场地上开战；技能表里只有这一招，
 *   PP 设为 1，所以只会磨一次，锋口窗口走完后能读到等级真的被收回。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/honeclaws 的锋口窗口；
 *   公共能力阶梯上物攻与命中各自真的被抬高了至少一级（boostWindow 的贡献可被 stage.stages 读到）；
 *   窗口结束后这两项回到基线（0），说明窗口拥有并收回同一份贡献。
 * 对磨拍数（strokes）与被削命中的恢复、封顶零收益、旋转/体型下两爪入镜这类观感与条件事实写进 note，
 *   交给轨迹与人工试玩判断，不硬断言。
 */
Smoke.scenario("honeclaws", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sneasel", level: 32, moves: ["honeclaws"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [7, 0, 0] });
    stage.setPp(caster, "honeclaws", 1);
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("honeclaws", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/honeclaws")
            && (stage.stages(caster).atk || 0) >= 1;
    }, function () {
        stage.expect(stage.casts("honeclaws", caster) > 0, "hone claws was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/honeclaws"), "the edge window carried the shared identity");
        const stages = stage.stages(caster);
        stage.expect((stages.atk || 0) >= 1, "hone claws really raised Attack on the shared ladder");
        stage.expect((stages.accuracy || 0) >= 1, "hone claws really raised accuracy on the shared ladder");
        stage.after(340, function () {
            const later = stage.stages(caster);
            stage.expect((later.atk || 0) <= 0 && (later.accuracy || 0) <= 0,
                "the edge window took its Attack and accuracy back when it ended");
            stage.note("hone claws: one pair of claws grinds beat by beat from the caster's real body facing (foot + half height, bodyYaw) with a short spark burst at the crossing; the edge window owns the ladder gain and returns it", {
                casts: stage.casts("honeclaws", caster),
                gainedAtk: stages.atk || 0,
                gainedAccuracy: stages.accuracy || 0,
                atkAfter: later.atk || 0,
                accuracyAfter: later.accuracy || 0,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "hone claws engages");
});
