/**
 * 单纯光束 / simplebeam 的可执行设计说明。
 *
 * 场面：一只只会「单纯光束」的大宇怪对一只特性是「毅力」的腕力开战，隔开一段距离。
 *   腕力是宝可梦、特性读得出来且可以被顶成单纯，所以改得动；大宇怪身上只有这一招，AI 只会放它。
 * 必然事实：单纯光束被提交过；目标身上出现过共享身份 world_combat:status/simplebeam 的标记。
 *   特性是否真的变成 simple、维持多久由共享结算与现场决定，写进 note。
 * 随机项：命中、AI 出手时机与接近过程写进 note，供读轨迹判断。
 */
Smoke.scenario("simplebeam", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("noon");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "beheeyem", level: 30, moves: ["simplebeam"], at: [-4, 0, 0] });
    var target = stage.pokemon({ species: "machop", level: 30, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, target);
    stage.until(420, function () {
        return stage.casts("simplebeam", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/simplebeam");
    }, function () {
        stage.expect(stage.casts("simplebeam", caster) > 0, "simple beam was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/simplebeam"), "the target carried the shared simple beam identity");
        stage.after(90, function () {
            stage.note("单纯光束把目标当前生效的特性改写成 simple（共享 NativeModifiers ability 层，到期自动还原原生特性），并挂上共享身份的标记；命中目标身上另有一个同寿命的托管效果持有贴身单纯光环。只对宝可梦、且特性可被顶替（不是 simple／truant、不带 cantsuppress）的目标改得动（预检直接拒绝）；空点散束、给友方则接强化。普通生物走共享等级翻倍入口，真正有一次能力等级变化落地时才会闪一下。特性是否真的变成 simple、维持多久由共享结算决定，留给完整装配的人工试玩。维持时长随等级与特攻、光环数随特攻、光束粗细随特攻、扩散半径随体型分别变化。", {
                casts: stage.casts("simplebeam", caster),
                beamActive: stage.hasMobEffect(target, "world_combat:status/simplebeam"),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the simple identity lands on a receivable target");
});
