/**
 * 潮旋 / whirlpool —— 可执行设计说明。
 *
 * 一句话：把一道自由瞄准的水旋甩到目标处，命中先灌一次水，此后水旋锚在原地、每 2 刻沿顺时针切向 + 向心把
 * 受困者绕回涡心并持续灌水、拖慢它；抗推目标不会被硬拽。
 *
 * 场面：特攻不低的卡咪龟带这一招，对一只被冻住 AI、站在原地的铁傀儡（耐打、不会还手、不会走开、且原生
 * 击退抗性 1.0 的靶子）。
 *
 * 断言只取必然事实：这招被提交过、目标挨到过伤害、目标身上出现过共享身份 `partiallytrapped`、目标的移动
 * 速度属性被压下去，以及抗推的铁傀儡没有被这记曳引强位移。命中、暴击、绕行轨迹都写进 note 供读轨迹判断。
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
        stage.after(40, function () {
            stage.expect(stage.casts("whirlpool", caster) >= 1, "wartortle committed whirlpool");
            stage.expect(stage.damageTo(heavy) > 0, "the whirlpool drowned the target");
            stage.expect(stage.hadMobEffect(heavy, "world_combat:status/partiallytrapped"), "the shared partiallytrapped identity landed on the target");
            stage.expect(stage.attribute(heavy, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the current lowered the iron golem's movement speed");
            stage.expect(stage.travelled(heavy) < 0.5, "the knockback-resistant iron golem was not force-displaced by the current");
            stage.note("the hit roll, the crit and how far a drag-susceptible target circles are positional/random", {
                casts: stage.casts("whirlpool", caster),
                damage: Math.round(stage.damageTo(heavy) * 10) / 10,
                speed: [baseSpeed, stage.attribute(heavy, "minecraft:generic.movement_speed")],
                travelled: Math.round(stage.travelled(heavy) * 10) / 10,
                heavyAlive: heavy.alive()
            });
            stage.setPp(caster, "whirlpool", 0);
            stage.command("kill " + caster.ref.split("/")[0]);
            stage.after(6, function () {
                stage.expect(!stage.hasMobEffect(heavy, "world_combat:whirlpool_current"), "source departure released the owned current carrier");
                stage.done();
            });
        });
    }, "whirlpool lands within 45 s");
});
