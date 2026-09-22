// 临别礼物的可执行设计说明：一只残血的宝可梦把一个凑在身边的非友方罩住，然后交出自己。
// 场面把施法者先打到远低于 ai.cornered 阈值的残血（/damage，magic 伤害不吃护甲），身边放一只
// 关掉 AI 的僵尸当靶子——它不会反击，保证施法者来得及把礼物送出去，同时它的攻击属性可以被读到。
// 必然事实：临别礼物在残血时被放出来过；身边的目标带上共享的「哀悼」身份；目标的攻击属性随
// 大幅下降的攻击与特攻一起走低；施法者交出生命后倒下。
// 削减由遗念承担，所以断言在遗念存在期间成立；遗念散去后靠它撑着的等级下降也随之退去。
// 炸开的具体人数、遗念是否恰好还在写进 note。
Smoke.scenario("memento", function (stage) {
    var caster = stage.pokemon({ species: "munchlax", level: 24, moves: ["memento"], at: [0, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [1.5, 0, 0] });
    var baseAttack = stage.attribute(foe, "minecraft:generic.attack_damage");
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..4,limit=1] {NoAI:1b}");
    stage.command("damage @e[type=cobblemon:pokemon,distance=..4,limit=1,sort=nearest] "
        + Math.max(1, Math.floor(caster.health() * 0.9)) + " minecraft:magic");
    stage.until(900, function () {
        return stage.casts("memento", caster) > 0
            && stage.hadMobEffect(foe, "world_combat:status/grieving")
            && stage.attribute(foe, "minecraft:generic.attack_damage") < baseAttack - 0.001;
    }, function () {
        stage.expect(stage.casts("memento", caster) > 0, "memento was committed by the cornered caster");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/grieving"), "the target carried the shared grieving identity");
        stage.expect(stage.attribute(foe, "minecraft:generic.attack_damage") < baseAttack - 0.001, "the target's attack fell along with the Attack and Sp. Atk drop");
        stage.expect(!caster.alive(), "the user spent its remaining HP and fainted");
        stage.note("the gift reaches visible non-friendlies inside the radius; the lingering remnant carries the Attack/Sp. Atk reduction, so it holds while the remnant lasts and fades with it. How many were caught and how long the remnant lived are timing facts.", {
            casts: stage.casts("memento", caster),
            baseAttack: baseAttack, attack: stage.attribute(foe, "minecraft:generic.attack_damage"),
            casterAlive: caster.alive(), foeAlive: foe.alive(), foeHp: foe.health()
        });
        stage.done();
    }, "memento lands on the adjacent zombie");
});
