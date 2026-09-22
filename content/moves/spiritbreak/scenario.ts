/**
 * 灵魂冲击的可执行设计说明：让只会灵魂冲击的长毛巨魔冲向一名原版生物。
 * 必然事实：本招被提交过；目标挨到伤害；目标的攻击属性随掉特攻一起走低
 *   （原版生物的特攻等级并入攻击阶梯，落到攻击属性上）。
 * 命中/暴击、掉 1 级还是 2 级、冲锋是否撞空都是随机或位置结果，写进 note。
 */
Smoke.scenario("spiritbreak", function (stage) {
    var caster = stage.pokemon({ species: "grimmsnarl", level: 50, moves: ["spiritbreak"], at: [-5, 0, 0] });
    var target = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var attack = stage.attribute(target, "minecraft:generic.attack_damage");
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("spiritbreak", caster) > 0
            && stage.damageTo(target) > 0
            && stage.attribute(target, "minecraft:generic.attack_damage") < attack - 0.001;
    }, function () {
        stage.expect(stage.casts("spiritbreak", caster) > 0, "灵魂冲击被放出来了");
        stage.expect(stage.damageTo(target) > 0, "冲撞打到了目标身上");
        stage.expect(stage.attribute(target, "minecraft:generic.attack_damage") < attack - 0.001, "目标的攻击随掉特攻下降");
        stage.note("命中/暴击、掉 1 级还是 2 级、冲锋是否撞空都是随机或位置结果，只作记录。",
            { casts: stage.casts("spiritbreak", caster), damage: Math.round(stage.damageTo(target) * 10) / 10,
                attack: [attack, stage.attribute(target, "minecraft:generic.attack_damage")] });
        stage.done();
    }, "冲撞打散目标气势");
});
