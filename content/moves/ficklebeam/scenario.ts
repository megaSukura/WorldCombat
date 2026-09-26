/**
 * 随机光 / ficklebeam 的可执行设计说明。
 *
 * 场面：会随机光的三首恶龙（Hydreigon，龙属性，天生多头）对 4 格外一只被点住、不会还手的铁傀儡，晴天平地。
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过伤害（光柱命中）。
 * 是否掷中「所有光股一起醒来并肩齐射」在准备期一次决定并存储——齐射时数股近线并行、同一目标本次合计伤害
 * 封顶为基础的两倍。写进 note 供读轨迹判断（同一目标掉血会明显分两档）。
 * 命中率、暴击与具体威力随个体数据浮动，不写断言。
 */
Smoke.scenario("ficklebeam", function (stage) {
    stage.fill([-12, -1, -10], [12, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Hydreigon", level: 45, moves: ["ficklebeam"], at: [-4, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    stage.command("execute as @e[type=minecraft:iron_golem,distance=..10] run data merge entity @s {NoAI:1b}");
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("ficklebeam", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("ficklebeam", caster) > 0, "ficklebeam was committed");
        stage.expect(stage.damageTo(foe) > 0, "the beam hit the target");
        stage.note("齐射（所有光股一起醒来、数股近线并行覆盖更宽）按 chance 在准备期一次决定并存储；同一目标本次合计伤害封顶为基础的两倍，不按股无限乘。这里只记录一次交战的观测值。", {
            casts: stage.casts("ficklebeam", caster),
            onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            foeHp: foe.health()
        });
        stage.done();
    }, "ficklebeam lands within 70 s");
});
