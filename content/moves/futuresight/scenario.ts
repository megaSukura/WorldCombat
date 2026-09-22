/**
 * 预知未来 / futuresight —— 可执行设计说明。
 *
 * 一句话：在对手头顶悬起一团念力，延迟片刻后落下打出一记特殊伤害。
 *
 * 场面：夜晚、石地。只带预知未来的xatu站在一侧，8 格外一只只带未实装招式的卡比兽作为目标——
 *   它不会用任何已注册招式，也不会在白天自燃，所以目标身上出现的每一点伤害都只可能来自落下的念力，
 *   便于把「延迟兑现」单独验出来。
 *
 * 必然事实：预知未来被提交过；目标身上出现过共享身份 world_combat:status/futuresight；延迟到点后
 *   目标受到过伤害（一团念力必然落下结算）。延迟长短、威力大小与是否暴击是随机项，写进 note。
 */
Smoke.scenario("futuresight", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");

    var caster = stage.pokemon({ species: "xatu", level: 40, moves: ["futuresight"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 55, moves: ["tackle"], at: [8, 0, 0] });
    stage.hostile(caster, foe);

    stage.until(1200, function () {
        return stage.casts("futuresight", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("futuresight", caster) >= 1, "the xatu committed Future Sight");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/futuresight"), "the target carried the foreseen mark");
        stage.expect(stage.damageTo(foe) > 0, "the delayed psychic mote landed and dealt damage");
        stage.note("the mote hovers for delay (50-240 ticks, delay x1.4 / quick x0.75) and follows the target before it drops; the damage is the sight power resolved against the target at landing", {
            casts: stage.casts("futuresight", caster),
            damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            foeAlive: foe.alive(),
            casterAlive: caster.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "the foreseen mote lands on the target within 60 s");
});
