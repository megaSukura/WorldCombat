/**
 * 流沙地狱 / sandtomb —— 可执行设计说明。
 *
 * 一句话：在瞄准的可达地面预置一片短命流沙坑；贴地站进去的目标先被磨一下，随后被逐步拖住、朝坑心收，离地即脱身。
 *
 * 场面：物攻不错的穿山王带这一招，对一只被冻住 AI、贴地站着的铁傀儡（耐打又不会还手、不会走开的靶子）。
 *
 * 断言只取必然事实：这招被提交过、目标挨到过伤害、目标身上出现过共享身份 `partiallytrapped`、
 * 目标的移动速度属性被压到近乎归零。命中前的裂纹、命中的伤害、坑的持续与扬沙写进 note 供读轨迹判断。
 */
Smoke.scenario("sandtomb", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sandslash", level: 40, moves: ["sandtomb"], at: [-5, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, heavy);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("sandtomb", caster) >= 1 && stage.damageTo(heavy) > 0
            && stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped");
    }, function () {
        stage.after(6, function () {
            stage.expect(stage.casts("sandtomb", caster) >= 1, "sandslash committed sand tomb");
            stage.expect(stage.damageTo(heavy) > 0, "the quicksand ground the target at least once");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped"), "the shared partiallytrapped identity landed on the target");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the quicksand dragged the iron golem's movement speed down");
            stage.note("the pit is placed on the real support face, so the stone floor is not rewritten; the grind roll and crit are positional while the target stands there", {
                casts: stage.casts("sandtomb", caster),
                damage: Math.round(stage.damageTo(heavy) * 10) / 10,
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                changedBlocks: stage.changedBlocks().length,
                heavyAlive: heavy.alive()
            });
            stage.setPp(caster, "sandtomb", 0);
            stage.expect(stage.travelled(heavy) < .5, "native knockback resistance prevents forced pit displacement");
            stage.command("tp " + heavy.ref.split("/")[0] + " ~2 ~1.2 ~");
            stage.after(3, function () {
                stage.expect(!stage.hasMobEffect(heavy, "world_combat:sandtomb_grip"), "leaving the support plane released the pit carrier");
                stage.expect(Math.abs(stage.attribute(heavy, "minecraft:generic.movement_speed") - baseSpeed) < .001,
                    "airborne release restored movement speed");
                stage.done();
            });
        });
    }, "sand tomb lands within 45 s");
});
