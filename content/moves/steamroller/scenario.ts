/**
 * 疯狂滚压 / steamroller —— 可执行设计说明。
 *
 * 一句话：把自己揉成一团滚出去，从一整排对手身上碾过去，把每个压到的人压得一愣。
 *
 * 场面：一只只会疯狂滚压的蜈蚣王前身——车轮球（40 级），对两只站在一条线上、被点住的僵尸（0.6 格与 2 格远）。
 * 必然事实：本招被提交过、至少一个敌人受到过伤害（滚过时压中）。
 * 一次压到几个、暴击、畏缩是否掷出都是概率/位置结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("steamroller", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "whirlipede", level: 40, moves: ["steamroller"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [0, 0, 0.5] });
    var side = stage.mob({ type: "minecraft:zombie", at: [2, 0, -0.5] });
    stage.hostile(caster, foe);
    stage.hostile(caster, side);
    stage.command("execute as @e[type=minecraft:zombie,distance=..10] run data merge entity @s {NoAI:1b,attributes:[{id:\"minecraft:generic.max_health\",base:220}],Health:220f}");
    stage.until(1200, function () {
        return stage.casts("steamroller", caster) >= 1 && (stage.damageTo(foe) > 0 || stage.damageTo(side) > 0);
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("steamroller", caster) >= 1, "caster committed steamroller");
            stage.expect(stage.damageTo(foe) + stage.damageTo(side) > 0, "the roll dealt damage");
            stage.note("how many bodies the roll swept, the 30%-style flinch roll and crits are random/positional; the pressed track is a short-lived terrain lease", {
                casts: stage.casts("steamroller", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                onSide: Math.round(stage.damageTo(side) * 10) / 10,
                flinchedFoe: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                flinchedSide: stage.hadMobEffect(side, "world_combat:status/flinch"),
                moved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "steamroller lands within 60 s");
});
