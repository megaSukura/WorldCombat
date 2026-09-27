/**
 * 拦堵的执行设计说明。
 *
 * 场面：一只只会拦堵的精灵站在场心，正前方（+z）一只不行动的僵尸互为敌人（贴到 3 格内，AI 认为值得立）。
 * 宝可梦默认朝向与"面向唯一威胁"都指向 +z，于是固定正面是确定的 +z：+z 一侧的接触打在正面、-z 一侧打在背面。
 * 必然事实：本招被提交过；正面接触被完全挡下、攻击者护甲被压低；随后在场心 -z 一侧出现的新敌人接触穿过拒马、照常造成伤害。
 * 挡下的量、降防级数、前后两次伤害与僵尸护甲前后值写进 note 供读轨迹判断。
 */
Smoke.scenario("obstruct", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 3, 8], "minecraft:air");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "Bastiodon", level: 45, moves: ["obstruct"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [0, 0, 3] });
    stage.noai(foe);
    stage.hostile(caster, foe);

    stage.until(600, function () { return stage.casts("obstruct", caster) > 0; }, function () {
        stage.expect(stage.casts("obstruct", caster) > 0, "obstruct was committed");
        var before = stage.damageTo(caster), armor = stage.attribute(foe, "minecraft:generic.armor");
        stage.command("damage " + String(caster.ref).split("/")[0] + " 5 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.after(4, function () {
            var front = stage.damageTo(caster) - before;
            stage.expect(front <= 0.001, "a contact from the fixed front was fully blocked");
            stage.expect(stage.attribute(foe, "minecraft:generic.armor") < armor, "the front contact lowered the attacker's armour");
            // 背面新敌人：拒马朝向固定在 +z，-z 一侧的接触应穿过。
            var back = stage.mob({ type: "minecraft:zombie", at: [0, 0, -3] });
            stage.noai(back);
            var frontAt = stage.damageTo(caster);
            stage.command("damage " + String(caster.ref).split("/")[0] + " 5 minecraft:mob_attack by " + String(back.ref).split("/")[0]);
            stage.after(4, function () {
                var rear = stage.damageTo(caster) - frontAt;
                stage.expect(rear > 0.001, "a contact from the side/back passed through the front stance");
                stage.note("obstruct directional", { frontDamage: front, backDamage: rear,
                    armourFrom: armor, armourTo: stage.attribute(foe, "minecraft:generic.armor") });
                stage.done();
            });
        });
    }, "obstruct raised");
});
