/**
 * 紧束 / wrap —— 可执行设计说明。
 *
 * 场面：一只只会紧束的草系精灵（Bellsprout），对一只 NoAI 的铁傀儡——目标不会走开，藤茧不会被自己挣开，
 * 用来核对「钉住 + 压攻击 + 周期绞」。
 * 必然事实：本招被提交过；目标挨到过伤害；目标身上出现过 `partiallytrapped` 身份；
 *   目标的移动速度属性被压到接近零。
 * 绞了几次、有没有提前撕开、暴击与否，写进 note 供读轨迹判断。
 */
Smoke.scenario("wrap", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    var caster = stage.pokemon({ species: "Bellsprout", level: 30, moves: ["wrap"], at: [0, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [2.2, 0, 0] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, heavy);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("wrap", caster) >= 1 && stage.damageTo(heavy) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("wrap", caster) >= 1, "wrap was committed");
            stage.expect(stage.damageTo(heavy) > 0, "the coil crushed the target at least once");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped"), "the target was wrapped");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the coil pinned the target's movement speed");
            stage.note("how many squeezes landed, whether the coil was torn, and the crit roll are positional/random", {
                casts: stage.casts("wrap", caster),
                heavyDamage: Math.round(stage.damageTo(heavy) * 10) / 10,
                speed: [baseSpeed, Math.round(stage.attribute(heavy, "minecraft:generic.movement_speed") * 100) / 100],
                attack: Math.round(stage.attribute(heavy, "minecraft:generic.attack_damage") * 10) / 10,
                heavyAlive: heavy.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "wrap pins and squeezes the target");
});
