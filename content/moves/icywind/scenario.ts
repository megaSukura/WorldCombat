/**
 * 冰冻之风 / icywind —— 可执行设计说明。
 *
 * 一句话：从嘴边吐出一堵会走的冷气锋，贴着地面向前推出整条走廊，扫到的敌人挨冻降速；墙把锋面截断在墙前。
 *
 * 场面：特攻高、速度也不慢的冰伊布带这一招，站在一只铁傀儡前面同一方向上，中间隔着一道实体墙；
 * 傀儡在墙前走廊里，逼出「锋面推进扫过」的场面，也核对「移动速度属性被压下去」这条跨对象的效果；
 * 墙后放一只被 NoAI 固定的牛，用来核对「墙后没有假命中」。
 *
 * 断言只取必然事实：这招被放过、墙前的铁傀儡挨到伤害且移动速度属性被压下去、墙后的野鼠一点没挨到、
 * 地面方块没有被替换。暴击、具体有几个人落在走廊里写进 note 供读轨迹判断。
 */
Smoke.scenario("icywind", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.fill([-3, 0, -7], [-3, 2, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "glaceon", level: 42, moves: ["icywind"], at: [-6, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [-4, 0, 0] });
    var shielded = stage.mob({ type: "minecraft:cow", at: [-1, 0, 0] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    // 两只靶子都固定不动：墙前的傀儡始终在同一位置、墙后的观察者不会绕路，判定与风廊方向都可复现。
    stage.noai(heavy, shielded);
    stage.hostile(caster, heavy);
    stage.hostile(caster, shielded);
    // 让两只靶子互为友方：铁傀儡不会顺手去砸墙后的观察者，观察者挨到的伤害才只可能来自这一阵风。
    stage.team("icywind-traps", [heavy, shielded]);
    stage.until(900, function () {
        return stage.casts("icywind", caster) >= 1 && stage.damageTo(heavy) > 0
            && stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.after(15, function () {
            stage.expect(stage.casts("icywind", caster) >= 1, "glaceon committed icy wind");
            stage.expect(stage.damageTo(heavy) > 0, "the cold front dealt damage in front of the wall");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the gust lowered the iron golem's movement speed");
            stage.expect(stage.damageTo(shielded) === 0, "the wall stopped the front: nothing behind it was hit");
            stage.expect(stage.changedBlocks().length === 0, "the front left no terrain changes");
            stage.note("how many stood inside the corridor and the crit roll are positional/random", {
                casts: stage.casts("icywind", caster),
                heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
                shieldedDamage: Math.round(stage.damageTo(shielded) * 10) / 10,
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                changed: stage.changedBlocks().length,
                heavyAlive: heavy.alive()
            });
            stage.done();
        });
    }, "icy wind sweeps a foe in front of a wall within 30 s");
});
