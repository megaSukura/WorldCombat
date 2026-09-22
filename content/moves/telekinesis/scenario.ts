/**
 * 意念移物的可执行设计说明。
 *
 * 场面：一只只会「意念移物」的凯西对 2 格外的腕力（站在地上）。目标站在地面、未被悬起、不怕地面，
 *   预检通过；AI 会在看到威胁后把它抬离地面。
 * 必然事实：本招被提交过；目标身上出现过浮空身份 world_combat:status/telekinesis——只有 MobEffect 真正写入时
 *   才会挂上这层身份。悬空期间的压制（移动速度下降）与地面免疫由同一身份承载，smoke 读不到属性倍率，
 *   写进 note 供读轨迹判断。
 */
Smoke.scenario("telekinesis", function (stage) {
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:stone");
    var caster = stage.pokemon({ species: "Abra", level: 45, moves: ["telekinesis"], at: [-1, 0, 0] });
    var target = stage.pokemon({ species: "Machop", level: 20, moves: ["tackle"], at: [1, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: abra(45) telekinesis vs grounded machop(20) tackle at 2 blocks; the target stands on stone and is not ground-weak");
    stage.until(1200, function () {
        return stage.casts("telekinesis", caster) >= 1 && stage.hadMobEffect(target, "world_combat:status/telekinesis");
    }, function () {
        stage.expect(stage.casts("telekinesis", caster) >= 1, "telekinesis was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/telekinesis"), "the target carried the telekinesis identity");
        stage.note("the target is held aloft: movement is suppressed through the mark and ground damage is negated by the shared incoming rule", {
            casts: stage.casts("telekinesis", caster), casterAlive: caster.alive(), targetAlive: target.alive(),
            targetTravelled: Math.round(stage.travelled(target) * 10) / 10
        });
        stage.done();
    }, "the target is lifted");
});
