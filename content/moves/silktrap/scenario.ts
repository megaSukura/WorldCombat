/**
 * 线阱的执行设计说明。
 *
 * 场面：一只只会线阱的精灵站定，5 格外一只僵尸开战并定身（noai）——只由脚本注入一次接触伤害，
 * 避免僵尸先撞网、让“第一记接触”的判定点漂移。
 * 必然事实：本招被提交过且丝网已铺开；第一记来自僵尸的接触攻击被挡下，僵尸的移动速度属性被压低（原降速），
 * 且同一刻丝网被抽干、保护结束（自己脱网）。挡下的量与速度前后值写进 note 供读轨迹判断。
 */
Smoke.scenario("silktrap", function (stage) {
    var caster = stage.pokemon({ species: "Spidops", level: 45, moves: ["silktrap"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(600, function () {
        return stage.casts("silktrap", caster) > 0 && stage.hasMobEffect(caster, "world_combat:silk_guard");
    }, function () {
        stage.expect(stage.casts("silktrap", caster) > 0, "silktrap was committed");
        var before = stage.damageTo(caster), speed = stage.attribute(foe, "minecraft:generic.movement_speed");
        stage.command("damage " + String(caster.ref).split("/")[0] + " 5 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.after(5, function () {
            stage.expect(stage.damageTo(caster) <= before + 0.001, "the silken web blocked the contact blow");
            stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < speed, "the contact cut the attacker's Speed");
            stage.expect(!stage.hasMobEffect(caster, "world_combat:silk_guard"), "the first contact spent the web and left the user an escape");
            stage.note("silktrap block, snare and release", { before: before, after: stage.damageTo(caster),
                speedFrom: speed, speedTo: stage.attribute(foe, "minecraft:generic.movement_speed"),
                health: caster.health(), webStillUp: stage.hasMobEffect(caster, "world_combat:silk_guard") });
            stage.done();
        });
    }, "silktrap raised");
});
