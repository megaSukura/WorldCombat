/**
 * 地狱突刺 / throatchop —— 可执行设计说明。
 *
 * 一句话：一记直取咽喉的突刺，物理命中之后把对手的嗓子封住，让它一段时间发不出声音类招式。
 *
 * 场面：夜晚、石地（避免僵尸一类目标在白天自燃干扰）。只带地狱突刺的absol紧贴着一只不会出招的
 *   卡比兽（只带未实装招式）——它贴身站着不还手，近身突刺必然够得到、也不会把目标逼跑；卡比兽皮糙
 *   肉厚，不会一击被打倒，封声身份与后续的声音招式尝试都能落在这段时间里。
 *
 * 必然事实：地狱突刺被提交过；目标受到过它的伤害；目标身上出现过共享身份 world_combat:status/throatchop。
 *   封声门禁写在共享动作策略里（带 sound 标记的招式在提交时被顶回去）；本场景的目标不会施放声音招式，
 *   所以门禁只由代码与试玩验证，写进 note 说明验证边界。
 */
Smoke.scenario("throatchop", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");

    var caster = stage.pokemon({ species: "absol", level: 40, moves: ["throatchop"], at: [-0.8, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 55, moves: ["splash"], at: [0.9, 0, 0] });
    stage.hostile(caster, foe);

    stage.until(1000, function () {
        return stage.casts("throatchop", caster) >= 1 && stage.hadMobEffect(foe, "world_combat:status/throatchop");
    }, function () {
        stage.expect(stage.casts("throatchop", caster) >= 1, "the absol committed Throat Chop");
        stage.expect(stage.damageTo(foe) > 0, "the thrust dealt physical damage to the target");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/throatchop"), "the target carried the throat-seal identity");
        stage.note("the silence window lasts 90-260 ticks (chokehold x1.25 / slash x0.75); the gate that turns back sound moves is a shared action policy, not observable with a passive target, so playtest it against a sound-move user", {
            castsByCaster: stage.casts("throatchop", caster),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            foeAlive: foe.alive(),
            casterAlive: caster.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "Throat Chop lands and seals the throat within 50 s");
});
