/**
 * 泼冷水的可执行设计说明：让只会泼冷水的可达鸭朝一名原版生物迎头泼一团冰水。
 * 必然事实：本招被提交过；目标挨到伤害；目标带上共享身份 world_combat:status/soaked；
 *   目标的攻击属性随掉攻一起走低（原版生物的能力等级落到攻击属性上）。
 * 命中/暴击、掉攻 1 级还是 2 级、冰面是否开启都是随机或位置结果，写进 note。
 */
Smoke.scenario("chillingwater", function (stage) {
    var caster = stage.pokemon({ species: "psyduck", level: 30, moves: ["chillingwater"], at: [-6, 0, 0] });
    var target = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var attack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("chillingwater", caster) > 0
            && stage.damageTo(target) > 0
            && stage.hadMobEffect(target, "world_combat:status/soaked")
            && stage.attribute(target, "minecraft:generic.attack_damage") < attack - 0.001;
    }, function () {
        stage.expect(stage.casts("chillingwater", caster) > 0, "泼冷水被放出来了");
        stage.expect(stage.damageTo(target) > 0, "冰水泼到了目标身上");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/soaked"), "目标带上了共享身份 soaked");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < attack - 0.001, "目标的攻击随掉攻下降");
        stage.note("命中/暴击、掉攻是 1 级还是 2 级、冰面是否开启都是随机或位置结果，只作记录。",
            { casts: stage.casts("chillingwater", caster), damage: Math.round(stage.damageTo(target) * 10) / 10,
                attack: [attack, stage.attribute(target, "minecraft:generic.attack_damage")] });
        stage.done();
    }, "冰水浇透目标");
});
