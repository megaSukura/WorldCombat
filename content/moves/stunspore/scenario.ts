/**
 * 麻痹粉的可执行设计说明。
 *
 * 场面：一只只会麻痹粉的走路草对 3 格外的卡比兽抛粉，卡比兽没有招式、站在原地。距离在射程内，AI 会直接出手。
 * 必然事实：本招被提交过；目标身上出现过共享麻痹（`world_combat:paralysis` 效果与 `world_combat:status/paralysis`
 *   身份）；麻痹把它的移动速度压低了。
 * 随机结果：命中率 75、粉团落地时卡比兽还在不在云里、以及它之后是否走出云外都写进 note 供读轨迹判断。
 *   它不造成伤害（原生威力 0）。
 */
Smoke.scenario("stunspore", function (stage) {
    var caster = stage.pokemon({ species: "Oddish", level: 35, moves: ["stunspore"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: [], at: [1, 0, 0] });
    stage.hostile(caster, target);
    var base = stage.attribute(target, "minecraft:generic.movement_speed");
    stage.until(1200, function () {
        return stage.casts("stunspore") > 0 && stage.hadMobEffect(target, "world_combat:status/paralysis");
    }, function () {
        stage.expect(stage.casts("stunspore") > 0, "stun spore was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:paralysis"), "the shared default paralysis effect landed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/paralysis"), "the paralysis carries the shared identity");
        stage.expect(stage.attribute(target, "minecraft:generic.movement_speed") < base - 0.0005, "paralysis slowed the target");
        stage.note("the cloud settled where the target stood and paralysed it; how long it stays inside depends on its wandering", {
            casts: stage.casts("stunspore"),
            speedFrom: base,
            speedTo: stage.attribute(target, "minecraft:generic.movement_speed"),
            damageToTarget: Math.round(stage.damageTo(target) * 100) / 100
        });
        stage.done();
    }, "the cloud catches the target");
});
