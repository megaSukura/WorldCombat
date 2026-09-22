/**
 * 冰冻之风 / icywind —— 可执行设计说明。
 *
 * 一句话：从嘴边吐出一堵会走的冷气锋，贴着地面向前推出整条走廊，扫到的敌人挨冻降速，走过的地方留下白霜。
 *
 * 场面：特攻高、速度也不慢的冰伊布带这一招，站在一只小敌与一只铁傀儡前面同一方向上；
 * 两者都在走廊里，逼出「锋面推进扫过一串」的场面。铁傀儡血厚，用来核对「移动速度属性被压下去」这条
 * 跨对象的效果；小敌用来核对伤害。
 *
 * 断言只取必然事实：这招被放过、至少一个敌人挨到伤害、铁傀儡的移动速度属性被压下去（锋过必降速）、
 * 锋面走过之后地表留下白霜。暴击、具体有几个人落在走廊里写进 note 供读轨迹判断。
 */
Smoke.scenario("icywind", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "glaceon", level: 42, moves: ["icywind"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [1.0, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [2.2, 0, 0.8] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.hostile(caster, heavy);
    stage.until(900, function () {
        return stage.casts("icywind", caster) >= 1 && stage.damageTo(foe) > 0
            && stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.after(15, function () {
            stage.expect(stage.casts("icywind", caster) >= 1, "glaceon committed icy wind");
            stage.expect(stage.damageTo(foe) > 0, "the cold front dealt damage");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the gust lowered the iron golem's movement speed");
            stage.expect(stage.changedBlocks().length > 0, "the front left frost on the ground");
            stage.note("how many stood inside the corridor and the crit roll are positional/random", {
                casts: stage.casts("icywind", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                changed: stage.changedBlocks().length,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "icy wind sweeps a foe within 30 s");
});
