/**
 * 流沙地狱 / sandtomb —— 可执行设计说明。
 *
 * 一句话：把一片沙甩到目标脚下，命中先磨一下，随后地面塌成流沙坑，把贴地的目标钉住、往坑心收、往下沉。
 *
 * 场面：物攻不错的穿山王带这一招，对一只被冻住 AI、贴地站着的铁傀儡（耐打又不会还手、不会走开的靶子）。
 *
 * 断言只取必然事实：这招被提交过、目标挨到过伤害、目标身上出现过共享身份 `partiallytrapped`、
 * 目标的移动速度属性被压到近乎归零。地面留下沙子、暴击与磨了几趟写进 note 供读轨迹判断。
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
            stage.expect(stage.damageTo(heavy) > 0, "the sand ground the target at least once");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped"), "the shared partiallytrapped identity landed on the target");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the quicksand pinned the iron golem's movement speed");
            stage.note("the hit roll, the crit and any sand left on the ground are positional/random or deferred while the target stands there", {
                casts: stage.casts("sandtomb", caster),
                damage: Math.round(stage.damageTo(heavy) * 10) / 10,
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                changedBlocks: stage.changedBlocks().length,
                heavyAlive: heavy.alive()
            });
            stage.done();
        });
    }, "sand tomb lands within 45 s");
});
