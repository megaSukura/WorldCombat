/**
 * 叶刃 / leafblade —— 可执行设计说明。
 *
 * 一句话：施法者站在自己的位置上扫出一记横斜叶斩，刀锋只切开首个碰到的敌人；它不自动贴近、不削防、不追加旁伤。
 *
 * 过程：相邻两刻刃姿之间按最大间距细分为有序子段，沿扫向逐个 trace 后取最先接触；刀高按当前身体实时重算，
 *   本体到刀根有实墙可达检查，显示按 Impact.position 裁到接触点；伤害被原生拒绝只做中性收刃。
 * 场面：一只只会叶刃的艾路雷朵（Gallade，真实学习者，物攻 125）对一只被点住、不会还手的铁傀儡
 *   （场景将基础护甲设为 12、生命设为 1000）。断言只取本设计必然事实：这招被提交过、首个敌人受过伤害、目标活着，
 *   且它的护甲在命中后**没有下降**（本招不再削防，走公共能力阶梯的旧行为已移除）。是否触发原生高暴击、是否命中
 *   首个接触而非穿透，写进 note。
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
            stage.expect(stage.damageTo(foe) > 0, "leaf blade cut the first foe it met");
            stage.expect(foe.alive(), "the cut is measured on a living foe");
            stage.expect(stage.attribute(foe, "minecraft:generic.armor") === armourBefore,
                "the diagonal cut no longer shaves defence (armour attribute unchanged)");
            stage.note("目标基础护甲设为12以观察削防已移除；本招不再自动贴近，刀锋按有序子段沿扫向取首个接触，原生暴击结果保留为观测。", {
                casts: stage.casts("leafblade", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                armourBefore: armourBefore,
                armourAfter: stage.attribute(foe, "minecraft:generic.armor")
            });
            stage.done();
        });
    }, "leaf blade lands within 35 s");
});
