/**
 * 万有引力 / gravapple —— 可执行设计说明。
 *
 * 一句话：把一颗大苹果送到目标正上方松手，苹果垂直落下砸中目标，目标防御下降；离地的目标会被砸回地面。
 *
 * 场面：唯一会这招的苹裹龙（50 级，只给这一招）对一只厚血、站桩的卡比兽（45 级，只会跃起）落苹果；
 * 另放一只蝙蝠在空中，给「目标离地」的分支一次机会。硬石地面，断言只取必然事实：这招被提交过、
 * 有目标受到过伤害。苹果修正落点是概率与位置相关的，命中谁、是否触发离地加成都写进 note。
 */
Smoke.scenario("gravapple", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "flapple", level: 50, moves: ["gravapple"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 45, moves: ["splash"], at: [5, 0, 0] });
    var flier = stage.mob({ type: "minecraft:bat", at: [4, 3, 1] });
    stage.hostile(caster, foe);
    stage.hostile(caster, flier);
    var landedAt = 0;
    stage.until(1300, function () {
        if (landedAt === 0 && stage.casts("gravapple", caster) >= 1 && (stage.damageTo(foe) > 0 || stage.damageTo(flier) > 0)) landedAt = stage.tick();
        return landedAt > 0 && stage.tick() >= landedAt + 12;
    }, function () {
        stage.expect(stage.casts("gravapple", caster) >= 1, "caster committed grav apple");
        stage.expect(stage.damageTo(foe) > 0 || stage.damageTo(flier) > 0, "grav apple dealt damage");
        stage.note("the apple steers toward the target; whether it caught the airborne bat (x1.5 and a slam) is positional", {
            casts: stage.casts("gravapple", caster),
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            flierDamage: Math.round(stage.damageTo(flier) * 10) / 10,
            foeCrushed: stage.hadMobEffect(foe, "world_combat:status/guardbroken"),
            flierCrushed: stage.hadMobEffect(flier, "world_combat:status/guardbroken"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "grav apple lands on a foe within 65 s");
});
