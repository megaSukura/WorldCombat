/**
 * 潮旋 / whirlpool —— 可执行设计说明。
 *
 * 一句话：把一道水旋甩到目标脚下，命中先灌一次水，此后水旋锚在原地持续把圈内的敌人朝涡心拽回、灌水并拖慢。
 *
 * 场面：特攻不低的卡咪龟带这一招，对一只被冻住 AI、站在原地的铁傀儡（耐打又不会还手、不会走开的靶子）。
 *
 * 断言只取必然事实：这招被提交过、目标挨到过伤害、目标身上出现过共享身份 `partiallytrapped`、
 * 目标的移动速度属性被压下去。命中、暴击、被拽多远都写进 note 供读轨迹判断。
 */
Smoke.scenario("whirlpool", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "wartortle", level: 40, moves: ["whirlpool"], at: [-5, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    var baseSpeed = stage.attribute(heavy, "minecraft:generic.movement_speed");
    stage.hostile(caster, heavy);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("whirlpool", caster) >= 1 && stage.damageTo(heavy) > 0
            && stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped");
    }, function () {
        stage.after(6, function () {
            stage.expect(stage.casts("whirlpool", caster) >= 1, "wartortle committed whirlpool");
            stage.expect(stage.damageTo(heavy) > 0, "the whirlpool drowned the target");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped"), "the shared partiallytrapped identity landed on the target");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the current lowered the iron golem's movement speed");
            stage.note("the hit roll, the crit and how far the current dragged the target are positional/random", {
                casts: stage.casts("whirlpool", caster),
                damage: Math.round(stage.damageTo(heavy) * 10) / 10,
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                travelled: Math.round(stage.travelled(heavy) * 10) / 10,
                heavyAlive: heavy.alive()
            });
            stage.done();
        });
    }, "whirlpool lands within 45 s");
});
