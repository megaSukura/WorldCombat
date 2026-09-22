/**
 * 贝壳夹击 / clamp —— 可执行设计说明。
 *
 * 一句话：施法者贴身把壳合上铁傀儡，双方都被钉住，壳每碾一次就掉一截血，铁傀儡的移动速度属性被压到零。
 *
 * 场面：防御极高、壳厚实的大舌贝带这一招，站在一只铁傀儡旁边；铁傀儡血厚、抗击退，用来核对夹持期间
 * 「双方都被定住」与「每跳碾压」，也保证夹持不会被击退扯断。
 *
 * 断言只取必然事实：这招被放过、目标挨到伤害、目标身上出现过夹击壳、目标的移动速度属性被压下去。
 * 暴击、具体几跳碾完写进 note 供读轨迹判断。
 */
Smoke.scenario("clamp", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "cloyster", level: 45, moves: ["clamp"], at: [-2.2, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [0.4, 0, 0] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, heavy);
    stage.until(900, function () {
        return stage.casts("clamp", caster) >= 1 && stage.damageTo(heavy) > 0
            && stage.hasMobEffect(heavy, "world_combat:clamped_shell")
            && stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("clamp", caster) >= 1, "cloyster committed clamp");
        stage.expect(stage.damageTo(heavy) > 0, "the shell crushed the target");
        stage.expect(stage.hadMobEffect(heavy, "world_combat:clamped_shell"), "the target was clamped");
        stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the clamp pinned the iron golem's movement speed");
        stage.note("how many crunches landed and the crit roll are positional/random", {
            casts: stage.casts("clamp", caster),
            heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
            speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
            heavyAlive: heavy.alive(),
            casterAlive: caster.alive()
        });
        stage.done();
    }, "clamp seizes and crushes a target within 30 s");
});
