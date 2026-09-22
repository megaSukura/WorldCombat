/**
 * 攀岩 的可执行设计说明：让只会这一招的重型精灵站在一片石板地上，朝 2 格外的一只僵尸蹬地扑过去。
 * 夜间（僵尸不会被日光灼烧），伤害只可能来自这一扑；石板地能看出落地蹬翻的土痕。
 * 必然事实：本招被提交过；目标受到过伤害（落地砸实）；落点的地面被蹬翻过（changedBlocks）。
 * 混乱（基础 20% 起）、命中 85 带来的扑偏、落地范围与踉跄都是随机或位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("rockclimb", function (stage) {
    stage.fill([-12, -1, -10], [12, -1, 10], "minecraft:stone");
    stage.time("night");
    var rhyhorn = stage.pokemon({ species: "rhyhorn", level: 34, moves: ["rockclimb"], at: [0, 0, 0] });
    var zombie = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(rhyhorn, zombie);
    stage.until(1200, function () { return stage.casts("rockclimb", rhyhorn) > 0 && stage.damageTo(zombie) > 0; }, function () {
        stage.after(40, function () {
            var scuffs = stage.changedBlocks().filter(function (entry) { return entry.before !== entry.after; });
            stage.expect(stage.casts("rockclimb", rhyhorn) > 0, "蹬地扑跃被放出来了");
            stage.expect(stage.damageTo(zombie) > 0, "落地砸中了目标并造成伤害");
            stage.expect(scuffs.length > 0, "落点把地表蹬翻了一小片");
            stage.note("混乱（基础 20% 起，物攻提高）、命中 85 带来的扑偏、落地范围与踉跄都是随机或位置结果，只作记录。",
                { casts: stage.casts("rockclimb", rhyhorn), damage: Math.round(stage.damageTo(zombie) * 10) / 10,
                  travelled: Math.round(stage.travelled(rhyhorn) * 10) / 10,
                  dazed: stage.hadMobEffect(zombie, "world_combat:status/confusion"),
                  scuffed: scuffs.length });
            stage.done();
        });
    }, "落地砸中地面上的目标");
});
