/**
 * 真空波 / vacuumwave 的可执行设计说明。
 *
 * 一句话：一只高特攻的宝可梦正对前方抡出一记真空波，波面扫过走廊里的目标；普通身板被朝施法者抽回来，
 *   满抗击退的 Boss 只吃特殊伤害、不被拽动。
 *
 * 场面：只会真空波的 Gardevoir（36 级）面对走廊里两只 NoAI 靶子——一只普通僵尸（近）与一只满抗击退的
 *   铁傀儡（远）。两只都被点住（NoAI），自己不会移动，所以任何位移只可能来自这一道的抽吸。两者开战，
 *   AI 只有这一招可用。
 * 必然事实：本招被提交过；铁傀儡挨到特殊伤害（抗推目标只受特殊伤）；僵尸被实际抽动（travelled > 0）。
 *   抽回多远写进 note 供读轨迹判断。平面场地中心线没有方块，因此不会被地形截断；被挡时的短波、波后新入者
 *   安全与前沿宽高匹配等分支留给人工试玩。
 */
Smoke.scenario("vacuumwave", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Gardevoir", level: 36, moves: ["vacuumwave"], at: [-2, 0, 0] });
    var pulled = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    var boss = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 0] });
    stage.hostile(caster, pulled);
    stage.hostile(caster, boss);
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..8,limit=1] {NoAI:1b}");
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("vacuumwave", caster) > 0 && stage.damageTo(boss) > 0 && stage.travelled(pulled) > 0;
    }, function () {
        stage.expect(stage.casts("vacuumwave", caster) > 0, "vacuum wave was committed");
        stage.expect(stage.damageTo(boss) > 0, "the wave dealt special damage to a knockback-resistant target");
        stage.expect(stage.travelled(pulled) > 0, "the landed wave dragged a normal target toward the caster");
        stage.note("The wave resolves only in the finite band swept each tick and pulls the caught side by hitDisplace: a normal body is dragged toward the caster, while a full-knockback-resistance iron golem only takes the special damage and is not moved. Both targets are NoAI, so any travel is the suction.", {
            casts: stage.casts("vacuumwave", caster),
            bossDamage: Math.round(stage.damageTo(boss) * 10) / 10,
            pulledMoved: Math.round(stage.travelled(pulled) * 10) / 10,
            bossMoved: Math.round(stage.travelled(boss) * 10) / 10,
            casterMoved: Math.round(stage.travelled(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "vacuum wave damages a resistant target and pulls a normal one");
});
