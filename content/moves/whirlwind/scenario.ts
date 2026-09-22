/**
 * 吹飞的可执行设计说明。
 *
 * 场面：一只只会「吹飞」的伙伴正对 8 格外的对手；风道长度默认 7 格，所以它会先靠近一点再推。
 * 必然事实：本招被提交过、对手身上出现过共享身份 world_combat:status/routed（溃退）。
 * 风墙是否扫到、被吹多远、有没有被推开后转身回来，受对手走位影响，写进 note 供读轨迹判断。
 */
Smoke.scenario("whirlwind", function (stage) {
    var caster = stage.pokemon({ species: "Pidgeot", level: 32, moves: ["whirlwind"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 30, moves: ["tackle"], at: [8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("whirlwind", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/routed");
    }, function () {
        stage.expect(stage.casts("whirlwind", caster) > 0, "吹飞被放出来了");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/routed"), "溃退身份落到了对手身上");
        stage.note("无伤害；风墙是一条向前推进的风道，对手被扫到后沿风向被推开并失去目标。扫中与否取决于对手是否站在风道里，不作为断言。",
            { casts: stage.casts("whirlwind", caster), travelled: Math.round(stage.travelled(foe) * 10) / 10, damageOnFoe: stage.damageTo(foe) });
        stage.done();
    }, "吹飞放出来且对手带上溃退");
});
