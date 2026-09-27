/**
 * 瑜伽姿势的可执行设计说明。
 *
 * 场面：一只只会瑜伽姿势的冥想童（Meditite）与一只僵尸相隔 8 格、铺了石质地面的场地上开战；天晴、白天。
 * 必然事实：本招被提交过；施法者身上出现过共享身份 world_combat:status/meditative 的入静标记。
 * 安静时是否真的叫醒两层、物攻等级最终抬了多少，写进 note 供读轨迹判断。
 */
Smoke.scenario("meditate", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Meditite", level: 30, moves: ["meditate"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [8, 0, 0] });
    stage.provoke(caster, foe);
    stage.noai(foe);
    stage.until(900, function () {
        return stage.casts("meditate", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/meditative");
    }, function () {
        stage.expect(stage.casts("meditate", caster) > 0, "meditate was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/meditative"), "the caster carried the shared meditative identity");
        stage.note("meditate observations", {
            casts: stage.casts("meditate", caster),
            meditative: stage.hadMobEffect(caster, "world_combat:status/meditative"),
            health: Math.round(caster.health() * 10) / 10,
            hurtBack: Math.round(stage.damageTo(caster) * 10) / 10
        });
        const timedTarget = caster;
        stage.expect(stage.hasMobEffect(timedTarget, "world_combat:meditative"), "the actual timed carrier is still active");
        stage.expect((stage.stages(timedTarget).atk || 0) > 0, "the carrier owns an active ability change");
        stage.setPp(caster, "meditate", 0);
        stage.team("timed-b-meditate", [caster, timedTarget]);
        stage.boost(timedTarget, { atk: 1 });
        stage.command("effect clear " + timedTarget.ref.split("/")[0] + " world_combat:meditative");
        stage.after(5, function () {
            stage.expect(!stage.hasMobEffect(timedTarget, "world_combat:meditative"), "cleansing removes the timed carrier");
            stage.expect((stage.stages(timedTarget).atk || 0) === 1, "cleansing restores this move's contribution while preserving a separate +1");
            stage.done();
        });
    }, "meditate is cast");
});
