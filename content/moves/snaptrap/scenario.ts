/**
 * 捕兽夹 / snaptrap —— 可执行设计说明。
 *
 * 一句话：施法者把一只铁夹抛到目标所在处埋好，目标踩上去被夹住定在原地，夹齿反复磨，速度属性归零。
 *
 * 场面：物攻不错的泥驴仔带这一招，隔一段距离对一只被减速定住、留在原地的铁傀儡埋夹；傀儡不会走开，
 * 逼出「夹子落地待机后咬住」的完整过程。
 *
 * 断言只取必然事实：这招被放过、目标挨到伤害、目标身上出现过夹齿身份、目标的移动速度属性被压下去。
 * 暴击、具体几跳磨完、是否滑动写进 note 供读轨迹判断。
 */
Smoke.scenario("snaptrap", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "stunfisk", level: 42, moves: ["snaptrap"], at: [-5, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, heavy);
    stage.until(900, function () {
        return stage.casts("snaptrap", caster) >= 1 && stage.damageTo(heavy) > 0
            && stage.hadMobEffect(heavy, "world_combat:snared_jaw");
    }, function () {
        stage.after(4, function () {
            stage.expect(stage.casts("snaptrap", caster) >= 1, "stunfisk committed snap trap");
            stage.expect(stage.damageTo(heavy) > 0, "the trap bit the target");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:snared_jaw"), "the target was caught in the jaws");
            stage.expect(stage.hasMobEffect(heavy, "world_combat:snared_jaw"), "the jaws are still holding the target");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the jaws pinned the iron golem's movement speed");
            stage.note("where the trap landed, the arm timing and the crit roll are positional/random", {
                casts: stage.casts("snaptrap", caster),
                heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                snared: stage.hasMobEffect(heavy, "world_combat:snared_jaw"),
                heavyAlive: heavy.alive()
            });
            stage.done();
        });
    }, "snap trap bites a target within 40 s");
});
