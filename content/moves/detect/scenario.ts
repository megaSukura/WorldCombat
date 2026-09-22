/**
 * 看穿的执行设计说明。
 *
 * 场面：一只只会看穿的精灵，6 格外一只僵尸开战。有威胁时 AI 会凝神读招。
 * 必然事实：本招被提交过；读招窗口内对它施加的一击被完整免除，并换来“先机”状态（共享身份 world_combat:status/opening）。
 * 免除量与先机等级写进 note 供读轨迹判断。
 */
Smoke.scenario("detect", function (stage) {
    var caster = stage.pokemon({ species: "Medicham", level: 40, moves: ["detect"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(600, function () {
        return stage.casts("detect", caster) > 0;
    }, function () {
        stage.expect(stage.casts("detect", caster) > 0, "detect was committed");
        var before = stage.damageTo(caster);
        stage.command("damage " + String(caster.ref).split("/")[0] + " 6 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.until(40, function () {
            return stage.hadMobEffect(caster, "world_combat:status/opening");
        }, function () {
            stage.expect(stage.damageTo(caster) <= before + 0.001, "the read blow was fully evaded");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/opening"), "the read granted an opening");
            stage.note("detect read", { before: before, after: stage.damageTo(caster), health: caster.health() });
            stage.done();
        }, "opening granted");
    }, "detect read window");
});
