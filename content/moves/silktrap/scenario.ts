/**
 * 线阱的执行设计说明。
 *
 * 场面：一只只会线阱的精灵，6 格外一只僵尸开战。僵尸贴进 5 格时 AI 会铺开丝网。
 * 必然事实：本招被提交过；丝网铺开后，一次来自僵尸的接触攻击被挡下，且僵尸的移动速度属性被压低（缠足 + 降速）。
 * 挡下的量、速度属性前后值写进 note 供读轨迹判断。
 */
Smoke.scenario("silktrap", function (stage) {
    var caster = stage.pokemon({ species: "Spidops", level: 45, moves: ["silktrap"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(600, function () {
        return stage.casts("silktrap", caster) > 0;
    }, function () {
        stage.expect(stage.casts("silktrap", caster) > 0, "silktrap was committed");
        var before = stage.damageTo(caster), speed = stage.attribute(foe, "minecraft:generic.movement_speed");
        stage.command("damage " + String(caster.ref).split("/")[0] + " 5 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.after(4, function () {
            stage.expect(stage.damageTo(caster) <= before + 0.001, "the silken web blocked the contact blow");
            stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < speed, "the contact snared the attacker and cut its Speed");
            stage.note("silktrap block and snare", { before: before, after: stage.damageTo(caster),
                speedFrom: speed, speedTo: stage.attribute(foe, "minecraft:generic.movement_speed"), health: caster.health() });
            stage.done();
        });
    }, "silktrap raised");
});
