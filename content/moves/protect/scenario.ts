/**
 * 守住的执行设计说明。
 *
 * 场面：一只只会守住的高防精灵，6 格外一只僵尸（僵尸会走近并近战）。有威胁时 AI 会撑罩。
 * 必然事实：本招被提交过；穹顶升起后，对它施加的一击被完整挡下（伤害不增加）。
 * 挡下的具体量、僵尸自己的攻击是否被算入，写进 note 供读轨迹判断。
 */
Smoke.scenario("protect", function (stage) {
    var caster = stage.pokemon({ species: "Shieldon", level: 40, moves: ["protect"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(600, function () {
        return stage.casts("protect", caster) > 0;
    }, function () {
        stage.expect(stage.casts("protect", caster) > 0, "protect was committed");
        var before = stage.damageTo(caster);
        stage.command("damage " + String(caster.ref).split("/")[0] + " 6 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.after(4, function () {
            stage.expect(stage.damageTo(caster) <= before + 0.001, "the raised dome blocked the blow");
            stage.note("protect block", { before: before, after: stage.damageTo(caster), health: caster.health() });
            stage.done();
        });
    }, "protect raised");
});
