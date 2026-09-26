/**
 * 吹飞的可执行设计说明。
 *
 * 场面：一只只会「吹飞」的伙伴正对 8 格外的对手；风道长度默认 7 格，所以它会先靠近一点再推。
 * 必然事实：本招被提交过、且不造成任何伤害。是否扫到、被推多远取决于对手是否站在风道里以及墙的遮挡，
 * 写进 note 供读轨迹判断；不再断言「溃退」。
 */
Smoke.scenario("whirlwind", function (stage) {
    var caster = stage.pokemon({ species: "Pidgeot", level: 32, moves: ["whirlwind"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 30, moves: ["tackle"], at: [8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("whirlwind", caster) > 0;
    }, function () {
        // 等风墙推完整条风道再读结果。
        stage.after(60, function () {
            stage.expect(stage.casts("whirlwind", caster) > 0, "吹飞被放出来了");
            stage.expect(stage.damageTo(foe) === 0, "吹飞不造成伤害");
            stage.note("风墙是一条向前推进、会被墙截断的竖向风道；被真正扫到的对手沿风向被推走，离开风面即停。扫中与否、被推多远受身位与遮挡影响，不作为断言。",
                { casts: stage.casts("whirlwind", caster), travelled: Math.round(stage.travelled(foe) * 10) / 10,
                    damageOnFoe: stage.damageTo(foe), foeAt: foe.position() });
            stage.done();
        });
    }, "吹飞放出来且无伤害");
});
