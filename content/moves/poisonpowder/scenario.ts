/**
 * 毒粉的可执行设计说明。
 *
 * 场面：一只只会毒粉的走路草对 3 格外的卡比兽撒粉，卡比兽没有招式、站在原地。距离在射程内，AI 会直接出手。
 * 必然事实：本招被提交过；目标身上出现过共享中毒（`minecraft:poison` 效果与 `world_combat:status/poison` 身份）。
 * 随机结果：命中率 75、粉团落地时卡比兽还在不在落点、以及毒在它身上跳了几次都写进 note 供读轨迹判断。
 *   它不造成伤害（原生威力 0），掉血来自共享中毒的毒伤。
 */
Smoke.scenario("poisonpowder", function (stage) {
    var caster = stage.pokemon({ species: "Oddish", level: 35, moves: ["poisonpowder"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: [], at: [1, 0, 0] });
    stage.hostile(caster, target);
    stage.until(1200, function () {
        return stage.casts("poisonpowder") > 0 && stage.hadMobEffect(target, "world_combat:status/poison");
    }, function () {
        stage.expect(stage.casts("poisonpowder") > 0, "poison powder was committed");
        stage.expect(stage.hadMobEffect(target, "minecraft:poison"), "the shared default poison effect landed on the target");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/poison"), "the poison carries the shared identity");
        stage.note("the puff burst on the point and poisoned whoever stood in it; the poison bites over time, not on impact", {
            casts: stage.casts("poisonpowder"),
            damageToTarget: Math.round(stage.damageTo(target) * 100) / 100,
            health: target.health()
        });
        stage.done();
    }, "the puff poisons the target");
});
