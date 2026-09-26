/**
 * 惊吓 / astonish 的可执行设计说明。
 *
 * 场面：只会惊吓的怨影娃娃（Shuppet）对 2 格外的一只僵尸；设为夜晚，僵尸不会被日光灼烧，
 * 伤害只可能来自这一声尖叫。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（从实际原点 trace 到真实接触的贴身尖叫命中）。
 * 是否掷出畏缩、这一声是否在暗处叫（夜晚露天方块光为 0）、暴击，写进 note 供读轨迹判断。
 */
Smoke.scenario("astonish", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Shuppet", level: 30, moves: ["astonish"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("astonish", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("astonish", caster) > 0, "astonish was committed");
            stage.expect(stage.damageTo(foe) > 0, "the scream dealt damage");
            stage.note("the flinch roll, the startle in darkness and crits are random/positional", {
                casts: stage.casts("astonish", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "astonish lands on a foe within range");
});
