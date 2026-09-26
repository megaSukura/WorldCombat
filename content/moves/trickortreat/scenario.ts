/**
 * 万圣夜 / trickortreat 的可执行设计说明。
 *
 * 场面：一只只会「万圣夜」的勾魂眼对一只单属性的尾立开战，隔开一段距离。尾立是普通属性，不是幽灵、属性层
 *   也还没占满，所以套得上外壳；勾魂眼身上只有这一招，AI 只会放它。
 * 必然事实：万圣夜被提交过；目标身上出现过共享身份 world_combat:status/trickortreat 的外壳。
 *   属性层是否被解除、壳留多久、装饰多少由时机与共享结算决定，写进 note。
 * 注意：本招现在敌我都能套（kind:aim），壳的表现与属性层绑定——属性层先被单独解除时，记录层会把外壳一起脱掉；
 *   给友方套壳挡一般／格斗的路径同样接线，动态手感留给完整装配的人工试玩。
 */
Smoke.scenario("trickortreat", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "sableye", level: 30, moves: ["trickortreat"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "sentret", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(700, function () {
        return stage.casts("trickortreat", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/trickortreat");
    }, function () {
        stage.expect(stage.casts("trickortreat", caster) > 0, "trick-or-treat was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/trickortreat"), "the target carried the shared trick-or-treat shell identity");
        stage.after(120, function () {
            stage.note("万圣夜把目标当前属性加一条 ghost 写进 NativeModifiers 临时属性层，并挂上共享身份的外壳；壳到期或被清除时解除属性层，属性随原生个体本身恢复；如果属性层先被单独解除，记录层会把外壳一起脱掉。现在敌我实体都能指定：对敌是打开幽灵／恶弱点，对友是替它挡一般／格斗；空点不套壳。只有当前属性少于三种、本身不是幽灵、且属性未被特性锁定的宝可梦套得上；非宝可梦没有属性，明确拒绝。属性是否真的带上 ghost、壳留多久、装饰多少、此后相性怎样变化由共享结算与世界读数决定，留给完整装配的人工试玩。外壳随等级与体重、装饰随体重、距离随身高分别变化。", {
                casts: stage.casts("trickortreat", caster),
                shellActive: stage.hasMobEffect(target, "world_combat:status/trickortreat"),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the ghost shell lands on an eligible target");
});
