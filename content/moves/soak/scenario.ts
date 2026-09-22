/**
 * 浸水 / soak 的可执行设计说明。
 *
 * 场面：一只只会「浸水」的玛力露丽对一只火属性的小火龙开战，隔开一段距离，脚下是自然草地。
 *   小火龙不是纯水属性，所以浇得进去；玛力露丽身上只有这一招，AI 只会放它。
 * 必然事实：浸水被提交过；目标身上出现过共享身份 world_combat:status/soak 的水属性标记。
 *   属性是否真的被换成水、湿泥留多久、漫流浇到几个人由共享结算与现场决定，写进 note。
 * 随机项：命中与否、AI 出手时机与接近过程写进 note，供读轨迹判断。
 */
Smoke.scenario("soak", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "azumarill", level: 30, moves: ["soak"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "charmander", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(420, function () {
        return stage.casts("soak", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/soak");
    }, function () {
        stage.expect(stage.casts("soak", caster) > 0, "soak was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/soak"), "the target carried the shared soak identity");
        var soaked = 0;
        stage.after(14, function () { soaked = stage.changedBlocks().length; });
        stage.after(90, function () {
            stage.note("浸水把目标当前的全部属性冲成单一水属性（共享 NativeModifiers types 层，到期自动还原原生属性），并挂上共享身份的水属性标记；浇过的地方把表土换成一格湿泥（world.terrain 租借，水干了原方块回来）。只对宝可梦、且不是纯水的目标浇得进去（纯水预检直接拒绝）。属性是否真的带上水、湿泥与漫流范围、水干还原由共享结算与世界读数决定，留给完整装配的人工试玩。浸透时长随等级与特攻、水柱条数随特攻、水花圈数随速度、湿泥留存随体重分别变化。", {
                casts: stage.casts("soak", caster),
                waterActive: stage.hasMobEffect(target, "world_combat:status/soak"),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                targetAlive: target.alive(),
                wetGround: soaked,
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the water-type identity lands on a non-water target");
});
