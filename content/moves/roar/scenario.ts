/**
 * 吼叫的可执行设计说明。
 *
 * 场面：一只只会「吼叫」的伙伴面对一只近身的对手（4 格，落在默认 6 格吼叫距离内）。
 * 必然事实：本招被提交过、对手身上出现过共享身份 world_combat:status/routed（溃退）。
 * 对手被逐开多远、是否掉头走开、有没有被逼回来，都受它的 AI 与走位影响，写进 note 供读轨迹判断；
 * 命中是必然的（无伤害、无命中检定），但被它躲出圈外就不写死。
 */
Smoke.scenario("roar", function (stage) {
    var caster = stage.pokemon({ species: "Arcanine", level: 32, moves: ["roar"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 30, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("roar", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/routed");
    }, function () {
        stage.expect(stage.casts("roar", caster) > 0, "吼叫被放出来了");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/routed"), "溃退身份落到了对手身上");
        stage.note("吼叫无伤害；溃退期间对手失去目标并被逐开守卫圈。逐退距离与是否转身走开随对手 AI 变化，不作为断言。",
            { casts: stage.casts("roar", caster), travelled: Math.round(stage.travelled(foe) * 10) / 10,
                damageOnFoe: stage.damageTo(foe), casterToFoe: Math.round(Math.sqrt(Math.pow(foe.position()[0] - caster.position()[0], 2) + Math.pow(foe.position()[2] - caster.position()[2], 2)) * 10) / 10 });
        stage.done();
    }, "吼叫放出来且对手带上溃退");
});
