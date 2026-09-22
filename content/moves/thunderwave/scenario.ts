/**
 * 电磁波的可执行设计说明。
 *
 * 场面：一只只会电磁波的皮卡丘对 4 格外的卡比兽放电，卡比兽没有招式、站着挨电。距离在射程内、中间没有遮挡，
 *   AI 会直接出手。
 * 必然事实：本招被提交过；目标身上出现过共享麻痹（`world_combat:paralysis` 效果与 `world_combat:status/paralysis`
 *   身份）；麻痹把它的移动速度压低了。
 * 随机结果：命中率 90、卡比兽的走位与是否先冲上来都写进 note 供读轨迹判断。它不造成伤害（原生威力 0）。
 */
Smoke.scenario("thunderwave", function (stage) {
    var caster = stage.pokemon({ species: "Pikachu", level: 35, moves: ["thunderwave"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: [], at: [1, 0, 0] });
    stage.hostile(caster, target);
    var base = stage.attribute(target, "minecraft:generic.movement_speed");
    stage.until(900, function () {
        return stage.casts("thunderwave") > 0 && stage.hadMobEffect(target, "world_combat:status/paralysis");
    }, function () {
        stage.expect(stage.casts("thunderwave") > 0, "thunder wave was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:paralysis"), "the shared default paralysis effect landed on the target");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/paralysis"), "the paralysis carries the shared identity");
        stage.expect(stage.attribute(target, "minecraft:generic.movement_speed") < base - 0.0005, "paralysis slowed the target");
        stage.note("a straight jolt landed; the arena has no line-of-sight blocker", {
            casts: stage.casts("thunderwave"),
            speedFrom: base,
            speedTo: stage.attribute(target, "minecraft:generic.movement_speed"),
            damageToTarget: Math.round(stage.damageTo(target) * 100) / 100
        });
        stage.done();
    }, "jolt lands");
});
