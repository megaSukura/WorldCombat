/**
 * 精神噪音 / psychicnoise —— 可执行设计说明。
 *
 * 一句话：一道令人不适的音波射出去，造成特殊伤害并让目标一段时间内回不了血。
 *
 * 场面：夜晚、石地。只带精神噪音的hatterene站在一侧，8 格外一只只带未实装招式的卡比兽作为目标——
 *   它不会用已注册招式，也不会在白天自燃，皮糙肉厚不至于被一击打倒，便于把「命中→挂上封回复身份」验出来。
 *
 * 必然事实：精神噪音被提交过；目标受到过伤害；目标身上出现过共享身份 world_combat:status/healblock。
 *   封回复桥接的是原生 world_combat:healing_incoming：命中封住后给目标挂原生再生（走 LivingHealEvent），
 *   封疗期内治疗在到达生命前被清零，目标生命不升；无治疗源时只读身份，写进 note 说明验证边界。
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
        var before = foe.health();
        // 原生再生走 LivingHealEvent，正是封疗桥拦截的那条路；封疗期内治疗在到达生命前被清零。
        stage.command("effect give @e[type=!player,distance=..24] minecraft:regeneration 8 5");
        stage.after(30, function () {
            stage.expect(stage.hasMobEffect(foe, "minecraft:regeneration"), "the target carried the native regeneration used for the check");
            stage.expect(foe.health() <= before + 0.001, "native healing is blocked while the seal is active");
            stage.note("the block lasts 90-260 ticks (piercing x0.85); a strong native regeneration (LivingHealEvent) is applied during the seal and the target's health does not rise, so the shared healing bridge is exercised; without any healing source only the identity is observable", {
                casts: stage.casts("psychicnoise", caster),
                damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                healthBeforeRegen: Math.round(before * 10) / 10,
                healthAfterRegen: Math.round(foe.health() * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "Psychic Noise lands, seals recovery and blocks native healing within 50 s");
});
