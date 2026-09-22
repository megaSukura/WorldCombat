/**
 * 火焰踢 / blazekick —— 可执行设计说明。
 *
 * 一句话：一只只会火焰踢的火焰鸡（blaziken，L40，原生学习者）拧身把裹火的腿沿一道上扬的弧线挑出去，
 *   踢中并对目标点燃，同时把它挑离地面。
 *
 * 场面：一只昏睡、不动的卡比兽（snorlax，L30）站在 2 格外——在踢程附近，逼 AI 先走完接近再踢；
 *   昏睡让目标留在原地，踢程与挑起判定不因走位失效；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过踢击伤害（`stage.damageTo`）。
 * 点燃是掷签、暴击与挑起的位移都是随机的，写进 note 供读轨迹判断。
 */
Smoke.scenario("blazekick", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "blaziken", level: 40, moves: ["blazekick"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], status: "sleep", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("blazekick", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(50, function () {
            stage.expect(stage.casts("blazekick", caster) >= 1, "the caster committed blaze kick");
            stage.expect(stage.damageTo(foe) > 0, "blaze kick dealt damage to the foe");
            stage.note("the burn roll, crits and the launch displacement are random", {
                casts: stage.casts("blazekick", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeBurned: stage.hadMobEffect(foe, "world_combat:status/burn"),
                foeY: Math.round(foe.position()[1] * 100) / 100,
                tick: stage.tick()
            });
            stage.done();
        });
    }, "blaze kick lands a flaming kick within 70 s");
});
