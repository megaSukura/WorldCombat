/**
 * ＤＤ金勾臂 / darkestlariat 的可执行设计说明。
 *
 * 场面：一只只会ＤＤ金勾臂的霸道熊猫（Pangoro，恶系物攻学习者）站在两只被点住、不会还手、不会移动的铁傀儡
 *   之间（耐打的靶子）；设为夜晚。开战，AI 只有这一招可用。
 * 必然事实：本招被提交过（`stage.casts`）；至少一只铁傀儡受到过伤害（整圈抡中了人）。
 * 一次抡到几个、目标是否涨过防、暴击与具体伤害，写进 note 供读轨迹判断。
 */
Smoke.scenario("darkestlariat", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Pangoro", level: 30, moves: ["darkestlariat"], at: [0, 0, 0] });
    var left = stage.mob({ type: "minecraft:iron_golem", at: [-2, 0, 1] });
    var right = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 1] });
    stage.hostile(caster, left);
    stage.hostile(caster, right);
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..8] run data merge entity @s {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("darkestlariat", caster) > 0 && (stage.damageTo(left) + stage.damageTo(right)) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("darkestlariat", caster) > 0, "darkestlariat was committed");
            stage.expect((stage.damageTo(left) + stage.damageTo(right)) > 0, "the spin hit at least one bystander");
            stage.note("原地一整圈横扫，圈内每个非友方各吃一记并被向外顶开；本招无视目标涨起来的防御能力等级。铁傀儡没有涨防，实际命中几人取决于站位，随机暴击留待人工试玩。", {
                casts: stage.casts("darkestlariat", caster),
                onLeft: Math.round(stage.damageTo(left) * 10) / 10,
                onRight: Math.round(stage.damageTo(right) * 10) / 10,
                onCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                leftAlive: left.alive(), rightAlive: right.alive()
            });
            stage.done();
        });
    }, "darkestlariat sweeps the ring");
});
