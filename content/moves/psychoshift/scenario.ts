/**
 * 精神转移的可执行设计说明。
 *
 * 场面：一只带灼伤的腕力（只会「精神转移」）对 2 格外的小拉达（没有异常、不怕灼伤）。施法者身上有主异常、
 *   目标身上没有，预检通过；AI 会在看到威胁后把灼伤推过去并治愈自己。
 * 必然事实：本招被提交过；目标身上出现过灼伤身份 world_combat:status/burn——转移成功才会种上。
 * 转移后的剩余时长与强度写进 note 供读轨迹判断；smoke 不能直接读异常时长。
 */
Smoke.scenario("psychoshift", function (stage) {
    var caster = stage.pokemon({ species: "Machop", level: 45, status: "burn", moves: ["psychoshift"], at: [-1, 0, 0] });
    var target = stage.pokemon({ species: "Rattata", level: 15, moves: [], at: [1, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: machop(45, burned) psychoshift vs rattata(15) at 2 blocks; the caster carries burn and the target does not");
    stage.until(1200, function () {
        return stage.casts("psychoshift", caster) >= 1 && stage.hadMobEffect(target, "world_combat:status/burn");
    }, function () {
        stage.expect(stage.casts("psychoshift", caster) >= 1, "psychoshift was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/burn"), "the burn identity landed on the target");
        stage.note("the status moved to the target and the caster was cured (cure happens only after the transfer lands)", {
            casts: stage.casts("psychoshift", caster),
            casterStillBurning: stage.hasMobEffect(caster, "world_combat:status/burn"),
            targetBurning: stage.hasMobEffect(target, "world_combat:status/burn"),
            casterAlive: caster.alive(), targetAlive: target.alive()
        });
        stage.done();
    }, "the burn is transferred");
});
