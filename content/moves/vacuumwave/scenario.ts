/**
 * 真空波 / vacuumwave 的可执行设计说明。
 *
 * 一句话：一只高特攻的宝可梦正对一只不会动的铁傀儡抡出一记真空波，波面扫过它并把它朝施法者抽回来。
 *
 * 场面：只会真空波的 Gardevoir（36 级）面对五格外的铁傀儡；铁傀儡被点住（NoAI），自己不会移动，
 *   所以它的位移只可能来自这一道的抽吸。两者开战，AI 只有这一招可用。
 * 必然事实：本招被提交过；目标受到过伤害；目标被抽动过（travelled > 0，NoAI 靶子自己不移动）。
 *   抽回多远、波面是否因起伏而未覆盖全走廊都写进 note 供读轨迹判断。平面场地中心线没有方块，因此不会被
 *   地形截断；被挡时的短波行为留给人工试玩。
 */
Smoke.scenario("vacuumwave", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Gardevoir", level: 36, moves: ["vacuumwave"], at: [-2, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("vacuumwave", caster) > 0 && stage.damageTo(foe) > 0 && stage.travelled(foe) > 0;
    }, function () {
        stage.expect(stage.casts("vacuumwave", caster) > 0, "vacuum wave was committed");
        stage.expect(stage.damageTo(foe) > 0, "the wave dealt damage");
        stage.expect(stage.travelled(foe) > 0, "the landed wave dragged the stationary target");
        stage.note("no contact and settled on Special Attack; the pull is a displacement toward the caster scaled by the target's bulk, and the NoAI golem never moves by itself, so any travelled is the suction.", {
            casts: stage.casts("vacuumwave", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeMoved: Math.round(stage.travelled(foe) * 10) / 10,
            casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "vacuum wave damages and pulls a stationary target");
});
