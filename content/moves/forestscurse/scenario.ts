/**
 * 森林诅咒 / forestscurse 的可执行设计说明。
 *
 * 场面：一只只会「森林诅咒」的朽木妖对一只一般属性的尾立开战，隔开一段距离。
 *   尾立是单属性、也不是草属性，所以装得下追加的草属性；朽木妖身上只有这一招，AI 只会放它。
 * 必然事实：森林诅咒被提交过；目标身上出现过共享身份 world_combat:status/forestscurse 的草属性标记。
 *   属性是否真的追加了草、诅咒多久、苔痕留多久由共享结算与现场决定，写进 note。
 * 随机项：命中、AI 出手时机与接近过程写进 note，供读轨迹判断。
 */
Smoke.scenario("forestscurse", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:grass_block");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "trevenant", level: 30, moves: ["forestscurse"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "sentret", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(420, function () {
        return stage.casts("forestscurse", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/forestscurse");
    }, function () {
        stage.expect(stage.casts("forestscurse", caster) > 0, "forest's curse was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/forestscurse"), "the target carried the shared forest curse identity");
        var grove = 0;
        stage.after(14, function () { grove = stage.changedBlocks().length; });
        stage.after(90, function () {
            stage.note("森林诅咒给目标当前属性**追加**一条草（共享 NativeModifiers types 层，到期自动还原原生属性），并挂上共享身份的草属性标记；命中处的地面被顶出一小块苔（world.terrain 租借，到期原方块回来）。只对单属性、非草的宝可梦种得上（双属性装不下第三条，预检直接拒绝）。属性是否真的多出草、诅咒多久、苔痕留存由共享结算与世界读数决定，留给完整装配的人工试玩。诅咒时长随等级与特攻、根须数随特攻、落叶数随速度、苔圈与苔痕随体型与体重分别变化。", {
                casts: stage.casts("forestscurse", caster),
                curseActive: stage.hasMobEffect(target, "world_combat:status/forestscurse"),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                targetAlive: target.alive(),
                mossGround: grove,
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the grass type is appended to a single-type target");
});
