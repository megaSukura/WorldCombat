/**
 * 踩踏 / stomp 的可执行设计说明。
 *
 * 场面：只会踩踏的铁甲犀牛（Rhyhorn，重）站在一片石板地上，对 2 格外的一只僵尸；夜间（僵尸不会被日光灼烧），
 * 伤害只可能来自这一脚。石板地能看出落点被踩出的塌陷。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害（正面砸实）；落点的地面被踩出过地痕（changedBlocks）。
 * 是否掷出畏缩、震波扫到几个旁人、暴击，都是概率与站位结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("stomp", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "rhyhorn", level: 34, moves: ["stomp"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("stomp", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(40, function () {
            var cracks = stage.changedBlocks().filter(function (entry) { return entry.before !== entry.after; });
            stage.expect(stage.casts("stomp", caster) > 0, "stomp was committed");
            stage.expect(stage.damageTo(foe) > 0, "the stomp dealt damage");
            stage.expect(cracks.length > 0, "the landing left a crater in the ground");
            stage.note("the flinch roll, the shock reaching bystanders and crits are random/positional", {
                casts: stage.casts("stomp", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                changed: cracks.length,
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "stomp lands on a grounded foe within range");
});
