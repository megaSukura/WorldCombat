/**
 * 王者盾牌的执行设计说明。
 *
 * 场面：一只只会王者盾牌的精灵，6 格外一只僵尸开战。僵尸贴进 5 格时 AI 会立起钢盾。
 * 必然事实：本招被提交过；钢盾立起后，一次来自僵尸的接触攻击被挡下，且僵尸的攻击属性被削低。
 * 挡下的量、攻击属性前后值写进 note 供读轨迹判断。
 */
Smoke.scenario("kingsshield", function (stage) {
    var caster = stage.pokemon({ species: "Aegislash", level: 45, moves: ["kingsshield"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.noai(foe); stage.provoke(caster, foe);
    stage.until(600, function () {
        return stage.casts("kingsshield", caster) > 0;
    }, function () {
        stage.expect(stage.casts("kingsshield", caster) > 0, "kingsshield was committed");
        var before = stage.damageTo(caster), attack = stage.attribute(foe, "minecraft:generic.attack_damage");
        stage.command("damage " + String(caster.ref).split("/")[0] + " 5 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.after(4, function () {
            stage.expect(stage.damageTo(caster) <= before + 0.001, "the steel shield blocked the contact blow");
            stage.expect(stage.attribute(foe, "minecraft:generic.attack_damage") < attack, "the contact lowered the attacker's Attack");
            stage.note("kingsshield block and parry", { before: before, after: stage.damageTo(caster),
                attackFrom: attack, attackTo: stage.attribute(foe, "minecraft:generic.attack_damage"), health: caster.health() });
            const afterFront = stage.damageTo(caster);
            stage.command("execute as " + foe.ref.split("/")[0] + " at " + caster.ref.split("/")[0] + " run tp @s ~-3 ~ ~");
            stage.command("damage " + caster.ref.split("/")[0] + " 8 minecraft:mob_attack by " + foe.ref.split("/")[0]);
            stage.after(3, function () {
                stage.expect(stage.damageTo(caster) > afterFront, "a real rear attack passes the fixed shield"); stage.done();
            });
        });
    }, "kingsshield raised");
});
