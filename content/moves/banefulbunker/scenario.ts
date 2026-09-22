/**
 * 碉堡的执行设计说明。
 *
 * 场面：一只只会碉堡的精灵，6 格外一只卫道士开战。卫道士贴进 5 格时 AI 会合拢毒壁。
 * 必然事实：本招被提交过；碉堡合拢后，一次来自卫道士的接触攻击被挡下，且它被灌上共享身份
 * world_combat:status/poison（与是不是宝可梦无关，任何生物共用同一条主异常）。
 * 用非亡灵的攻击者是有意为之：亡灵受原版 canBeAffected 保护、不吃中毒，灌毒走的是原版规则。
 * 挡下的量、灌毒是否落地写进 note 供读轨迹判断；剧毒升级需要目标先中毒，这里不构造该前置。
 */
Smoke.scenario("banefulbunker", function (stage) {
    var caster = stage.pokemon({ species: "Toxapex", level: 45, moves: ["banefulbunker"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:vindicator", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(600, function () {
        return stage.casts("banefulbunker", caster) > 0;
    }, function () {
        stage.expect(stage.casts("banefulbunker", caster) > 0, "banefulbunker was committed");
        var before = stage.damageTo(caster);
        stage.command("damage " + String(caster.ref).split("/")[0] + " 5 minecraft:mob_attack by " + String(foe.ref).split("/")[0]);
        stage.after(4, function () {
            stage.expect(stage.damageTo(caster) <= before + 0.001, "the venomous wall blocked the contact blow");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/poison"), "the contact poisoned the attacker");
            stage.note("banefulbunker block and poison", { before: before, after: stage.damageTo(caster),
                poisoned: stage.hadMobEffect(foe, "world_combat:status/poison"), health: caster.health() });
            stage.done();
        });
    }, "banefulbunker raised");
});
