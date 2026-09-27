/**
 * 单纯光束 / simplebeam 的可执行设计说明。
 *
 * 场面：一只只会「单纯光束」的大宇怪对一只不还手的铁傀儡开战，隔开一段距离。
 *   铁傀儡是普通生物（非宝可梦），走的是共享的等级翻倍入口：改写后它的下一次能力等级变化会翻倍。
 * 必然事实：单纯光束被提交过；目标身上出现过共享身份 world_combat:status/simplebeam 的标记；
 *   之后给目标加 1 级攻击，真实落地的是 2 级（翻倍一次）。
 *   特性改写是否真的变成 simple、维持多久、扩散命中谁由共享结算与现场决定，写进 note。
 */
Smoke.scenario("simplebeam", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("noon");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "beheeyem", level: 30, moves: ["simplebeam"], at: [-4, 0, 0] });
    var target = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 0] });
    stage.noai(target);
    stage.hostile(caster, target);
    stage.until(500, function () {
        return stage.casts("simplebeam", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/simplebeam");
    }, function () {
        stage.expect(stage.casts("simplebeam", caster) > 0, "simple beam was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/simplebeam"), "the target carried the shared simple beam identity");
        stage.after(20, function () {
            // 普通生物走共享等级入口：翻倍应在这里兑现一次。
            stage.boost(target, { atk: 1 });
            stage.after(5, function () {
                var stages = stage.stages(target);
                stage.expect(stages.atk === 2, "a non-Pokemon's later stat change was doubled once");
                stage.note("单纯光束把目标当前生效的特性改写成 simple（宝可梦走共享 NativeModifiers ability 层，锚在真实载体上、到期自动还原原生特性），并挂上共享身份的标记；普通生物没有特性层，改走共享等级变化翻倍入口。命中目标身上另有一个同寿命、锚在同一载体上的托管效果持有贴身单纯光环。只对宝可梦、且特性可被顶替（不是 simple／truant、不带 cantsuppress）的目标改得动（预检直接拒绝）；空点散束、给友方则接强化。维持时长随等级与特攻、光环数随特攻、光束粗细随特攻、扩散半径随体型分别变化。", {
                    casts: stage.casts("simplebeam", caster),
                    beamActive: stage.hasMobEffect(target, "world_combat:status/simplebeam"),
                    boostedAtk: stages.atk,
                    damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                    damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                    targetAlive: target.alive(),
                    tick: stage.tick()
                });
                stage.done();
            });
        });
    }, "the simple identity lands on a non-Pokemon target");
});
