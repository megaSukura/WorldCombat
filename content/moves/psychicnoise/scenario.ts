/**
 * 精神噪音 / psychicnoise —— 可执行设计说明。
 *
 * 一句话：一道令人不适的音波射出去，造成特殊伤害并让目标一段时间内回不了血。
 *
 * 场面：夜晚、石地。只带精神噪音的hatterene站在一侧，8 格外一只只带未实装招式的卡比兽作为目标——
 *   它不会用已注册招式，也不会在白天自燃，皮糙肉厚不至于被一击打倒，便于把「命中→挂上封回复身份」验出来。
 *
 * 必然事实：精神噪音被提交过；目标受到过伤害；目标身上出现过共享身份 world_combat:status/healblock。
 *   封回复是对共享治疗入口的封锁：本轮的私有装配里没有会治疗的招式／特性／道具，所以封回复本身
 *   只能读到身份、无法在场上直接观察到治疗被挡下；写进 note 说明验证边界。
 */
Smoke.scenario("psychicnoise", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");

    var caster = stage.pokemon({ species: "hatterene", level: 42, moves: ["psychicnoise"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 55, moves: ["tackle"], at: [8, 0, 0] });
    stage.hostile(caster, foe);

    stage.until(1000, function () {
        return stage.casts("psychicnoise", caster) >= 1 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/healblock");
    }, function () {
        stage.expect(stage.casts("psychicnoise", caster) >= 1, "the hatterene committed Psychic Noise");
        stage.expect(stage.damageTo(foe) > 0, "the sound wave dealt special damage");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/healblock"), "the target carried the heal-block identity");
        stage.note("the block lasts 90-260 ticks (piercing x0.85); with no healing source in this private assembly the block itself is not observable here more than the shared identity on the target, which is what the healing registry reads", {
            casts: stage.casts("psychicnoise", caster),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            foeAlive: foe.alive(),
            casterAlive: caster.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "Psychic Noise lands and seals recovery within 50 s");
});
