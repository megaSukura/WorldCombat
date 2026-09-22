/**
 * 叶刃 / leafblade —— 可执行设计说明。
 *
 * 一句话：施法者贴身上前，横挥一记重斩切开对手，并在它身上留下一个削防的裂口。
 *
 * 场面：一只只会叶刃的艾路雷朵（Gallade，真实学习者，物攻 125）对一只被点住、不会还手的铁傀儡
 *   （场景将基础护甲设为 12、生命设为 1000，在存活目标上读出削防）。断言只取必然事实：这招被提交过、目标受过伤害、目标的护甲属性被削低
 *   （削防走公共能力阶梯，普通生物落到 minecraft:generic.armor）。是否触发原生高暴击写进 note。
 */
Smoke.scenario("leafblade", function (stage) {
    stage.fill([-12, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gallade", level: 45, moves: ["leafblade"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.command("attribute @e[type=minecraft:iron_golem,distance=..8,limit=1] minecraft:generic.armor base set 12");
    stage.command("attribute @e[type=minecraft:iron_golem,distance=..8,limit=1] minecraft:generic.max_health base set 1000");
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {Health:1000f}");
    var armourBefore = stage.attribute(foe, "minecraft:generic.armor");
    stage.until(700, function () {
        return stage.casts("leafblade", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(1, function () {
            stage.expect(stage.casts("leafblade", caster) >= 1, "the caster committed leaf blade");
            stage.expect(stage.damageTo(foe) > 0, "leaf blade cut the foe");
            stage.expect(foe.alive(), "defence is measured on a living foe");
            stage.expect(stage.attribute(foe, "minecraft:generic.armor") < armourBefore,
                "the deep cut lowered the foe's defence (armour attribute)");
            stage.note("目标基础护甲设为12，以观察削防的实际变化；原生暴击结果保留为观测。", {
                casts: stage.casts("leafblade", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                armourBefore: armourBefore,
                armourAfter: stage.attribute(foe, "minecraft:generic.armor")
            });
            stage.done();
        });
    }, "leaf blade lands within 35 s");
});
