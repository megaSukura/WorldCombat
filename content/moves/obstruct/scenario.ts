/**
 * 拦堵的执行设计说明。
 *
 * 场面：一只只会拦堵的精灵，6 格外一只僵尸开战。僵尸贴进 4 格时 AI 会立起拒马。
 * 必然事实：本招被提交过；拒马立起后，一次来自僵尸的接触攻击被挡下，且僵尸的护甲被接触惩罚压低。
 * 挡下的量、降防级数、僵尸护甲前后值写进 note 供读轨迹判断。
 */
Smoke.scenario("obstruct", function (stage) {
    var caster = stage.pokemon({ species: "Bastiodon", level: 45, moves: ["obstruct"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(600, function () {
        return stage.casts("obstruct", caster) > 0;
    }, function () {
        stage.expect(stage.casts("obstruct", caster) > 0, "obstruct was committed");
        var before = stage.damageTo(caster), armor = stage.attribute(foe, "minecraft:generic.armor");
        stage.command("damage " + String(caster.ref).split("/")[0] + " 5 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.after(4, function () {
            stage.expect(stage.damageTo(caster) <= before + 0.001, "the barricade blocked the contact blow");
            stage.expect(stage.attribute(foe, "minecraft:generic.armor") < armor, "the contact lowered the attacker's armour");
            stage.note("obstruct punish", { before: before, after: stage.damageTo(caster), armourFrom: armor, armourTo: stage.attribute(foe, "minecraft:generic.armor") });
            stage.done();
        });
    }, "obstruct raised");
});
