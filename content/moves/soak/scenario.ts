/**
 * 浸水 / soak 的可执行设计说明。
 *
 * 场面：一只只会「浸水」的玛力露丽对一只站定的原版僵尸开战，隔开一段距离，脚下是自然草地。
 *   僵尸没有宝可梦属性、也不是水属性，所以浇得进去——这正是本设计「任何活体都能被浇成水」的核心；
 *   玛力露丽身上只有这一招，AI 只会放它。
 * 必然事实：浸水被提交过；目标身上出现过共享身份 world_combat:status/soak 的水属性标记。
 *   属性是否真的被换成水、水膜何时散去、漫流浇到几个同阵营目标由共享结算与现场决定，写进 note。
 * 随机项：AI 出手时机与接近过程写进 note，供读轨迹判断。
 */
Smoke.scenario("soak", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:grass_block");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "azumarill", level: 30, moves: ["soak"], at: [-3, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.noai(target);
    stage.hostile(caster, target);
    stage.until(420, function () { return stage.casts("soak", caster) > 0; }, function () {
        stage.fill([0, 0, -3], [0, 4, 3], "minecraft:stone");
        stage.after(25, function () {
            stage.expect(!stage.hadMobEffect(target, "world_combat:status/soak"), "a wall raised during the pour prevented the type layer");
            stage.fill([0, 0, -3], [0, 4, 3], "minecraft:air");
            stage.note("The blocked first pour ended at the real wall; the second cast has a clear route.");
        });
    }, "soak starts pouring before the wall");
    stage.until(420, function () {
        return stage.casts("soak", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/soak");
    }, function () {
        stage.expect(stage.casts("soak", caster) > 0, "soak was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/soak"), "the plain vanilla mob carried the shared soak identity");
        stage.after(90, function () {
            stage.note("浸水先沿视线浇一段短水柱，水落到身上才把目标当前的全部属性冲成单一水属性（共享 CombatTypes 临时类型层，随浸水载体到期或解除而消退）；原版普通生物没有宝可梦属性也能被浇成水，证明本招对所有活体走同一条路。水膜由同一类型层拥有，水干时一起散去。已经是纯水或类型锁定的目标在预检拒绝，空点只泼水、不附带属性目标；漫流只波及与主目标同敌我类别、且从落点看得见的一圈人。属性是否真的带上水、水膜与漫流范围、水干还原由共享结算与世界读数决定，留给完整装配的人工试玩。浸透时长随等级与特攻、水柱条数随特攻、水花圈数随速度分别变化。", {
                casts: stage.casts("soak", caster),
                waterActive: stage.hasMobEffect(target, "world_combat:status/soak"),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the water-type identity lands on a plain vanilla mob");
});
