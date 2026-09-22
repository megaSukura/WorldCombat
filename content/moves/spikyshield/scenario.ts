/**
 * 尖刺防守的执行设计说明。
 *
 * 场面：一只只会尖刺防守的精灵，6 格外一只僵尸开战。僵尸贴进 5 格时 AI 会炸开藤刺甲。
 * 必然事实：本招被提交过；藤甲升起后，一次来自僵尸的接触攻击被挡下，而僵尸被接触穿刺掉了一部分体力。
 * 挡下的量、扎出的伤害、僵尸体力前后值写进 note 供读轨迹判断。
 */
Smoke.scenario("spikyshield", function (stage) {
    var caster = stage.pokemon({ species: "Chesnaught", level: 45, moves: ["spikyshield"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(600, function () {
        return stage.casts("spikyshield", caster) > 0;
    }, function () {
        stage.expect(stage.casts("spikyshield", caster) > 0, "spikyshield was committed");
        var before = stage.damageTo(caster);
        stage.command("damage " + String(caster.ref).split("/")[0] + " 5 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.after(4, function () {
            stage.expect(stage.damageTo(caster) <= before + 0.001, "the thorn shield blocked the contact blow");
            stage.expect(stage.damageTo(foe) > 0, "the contact pricked the attacker for damage");
            stage.note("spikyshield block and prick", { before: before, after: stage.damageTo(caster),
                attackerDamage: stage.damageTo(foe), health: caster.health() });
            stage.done();
        });
    }, "spikyshield raised");
});
