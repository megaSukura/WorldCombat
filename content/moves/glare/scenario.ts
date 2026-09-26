/**
 * 大蛇瞪眼的可执行设计说明。
 *
 * 场面：一只只会大蛇瞪眼的阿柏蛇对 3 格外的卡比兽昂首，卡比兽没有招式、站在扇形里。中间没有遮挡，
 *   距离在扇形半径内，AI 会把朝向对准它并直接出手。
 * 必然事实：本招被提交过；目标身上出现过共享麻痹（`world_combat:paralysis` 效果与 `world_combat:status/paralysis`
 *   身份）；麻痹把它的移动速度压低了。
 * 随机结果：卡比兽的走位（是否仍留在扇形内）写进 note 供读轨迹判断。它不造成伤害（原生威力 0）。
 *   扇形一次能罩住几个取决于他们站在哪、以及是否与施法者通视；本场只有一个目标，侧背/遮挡不受影响需要另摆场面。
 */
Smoke.scenario("glare", function (stage) {
    var caster = stage.pokemon({ species: "Ekans", level: 35, moves: ["glare"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: [], at: [1, 0, 0] });
    stage.hostile(caster, target);
    var base = stage.attribute(target, "minecraft:generic.movement_speed");
    stage.until(900, function () {
        return stage.casts("glare") > 0 && stage.hadMobEffect(target, "world_combat:status/paralysis");
    }, function () {
        stage.expect(stage.casts("glare") > 0, "glare was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:paralysis"), "the shared default paralysis effect landed on the target");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/paralysis"), "the paralysis carries the shared identity");
        stage.expect(stage.attribute(target, "minecraft:generic.movement_speed") < base - 0.0005, "paralysis slowed the target");
        stage.note("the frontal fan caught the target standing inside it; one target only, so area coverage is not asserted here", {
            casts: stage.casts("glare"),
            speedFrom: base,
            speedTo: stage.attribute(target, "minecraft:generic.movement_speed"),
            damageToTarget: Math.round(stage.damageTo(target) * 100) / 100
        });
        stage.done();
    }, "the glare lands");
});
