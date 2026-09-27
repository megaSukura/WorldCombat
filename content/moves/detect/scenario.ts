/**
 * 看穿的执行设计说明。
 *
 * 场面：一只只会看穿的精灵，6 格外一只僵尸开战。有威胁时 AI 会凝神读招。
 * 必然事实：本招被提交过；读招窗口内对它施加的一击被完整免除，并换来“先机”状态（共享身份 world_combat:status/opening）。
 * 免除量与先机等级写进 note 供读轨迹判断。
 */
Smoke.scenario("detect", function (stage) {
    var caster = stage.pokemon({ species: "Medicham", level: 40, moves: ["detect"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    stage.hostile(caster, foe);
    // Freeze the zombie so the only direct blow is the one injected below; the read stays deterministic.
    stage.noai(foe);
    stage.until(600, function () {
        return stage.casts("detect", caster) > 0;
    }, function () {
        stage.expect(stage.casts("detect", caster) > 0, "detect was committed");
        var before = stage.damageTo(caster);
        // The same enemy deals residual (non-direct) damage first: it must not spend the single read.
        stage.hurt(caster, 3, "minecraft:magic", { source: foe, metadata: { kind: "residual" } });
        stage.command("damage " + String(caster.ref).split("/")[0] + " 6 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.until(40, function () {
            return stage.hadMobEffect(caster, "world_combat:status/opening");
        }, function () {
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/opening"), "a direct hit was read after residual damage and granted an opening");
            stage.note("detect read", { before: before, after: stage.damageTo(caster), residualAccepted: stage.damageTo(caster) > before, health: caster.health() });
            stage.done();
        }, "opening granted");
    }, "detect read window");
});
