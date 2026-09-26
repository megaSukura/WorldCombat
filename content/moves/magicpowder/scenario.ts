/**
 * 魔法粉 / magicpowder 的可执行设计说明。
 *
 * 场面：一只只会「魔法粉」的布莉姆温对一只一般属性的尾立开战，隔开一段距离。
 *   尾立不是草属性、也不是纯超能力，所以撒得上去；布莉姆温身上只有这一招，AI 只会放它。
 * 必然事实：魔法粉被提交过；目标身上出现过共享身份 world_combat:status/magicpowder 的超能力标记。
 *   属性是否真的被改写成超能力、改写多久、粉团命中与否由共享结算与现场决定，写进 note。
 * 随机项：命中、AI 出手时机与接近过程写进 note，供读轨迹判断。
 */
Smoke.scenario("magicpowder", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:grass_block");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "hatterene", level: 30, moves: ["magicpowder"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "sentret", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(420, function () {
        return stage.casts("magicpowder", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/magicpowder");
    }, function () {
        stage.expect(stage.casts("magicpowder", caster) > 0, "magic powder was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/magicpowder"), "the target carried the shared magic powder identity");
        stage.after(90, function () {
            stage.note("魔法粉把目标当前的全部属性改写成单一超能力（共享 NativeModifiers types 层，到期自动还原原生属性），并挂上共享身份的超能力标记。粉团是真实飞行的慢弹：可瞄友或敌，也能点／方向空撒，撞墙自散、不留同质粉云；不改写就只是抖开粉末。草属性生物会把粉抖掉、完全免疫；纯超能力的目标也撒不上去（预检直接拒绝）。属性是否真的带上超能力、改写时长、命中与否由共享结算决定，留给完整装配的人工试玩。改写时长随等级与特防、粉粒数随特攻、闪点数随等级、粉团半径随体型分别变化。", {
                casts: stage.casts("magicpowder", caster),
                psychicActive: stage.hasMobEffect(target, "world_combat:status/magicpowder"),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the psychic-type identity lands on a non-grass, non-psychic target");
});
