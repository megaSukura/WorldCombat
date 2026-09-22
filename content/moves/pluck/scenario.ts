/**
 * 啄食的可执行设计说明：一只飞行啄击手，对一只携带树果的目标出手。
 * 必然事实：本招被提交过、目标受过伤（长喙啄中）。树果被啄下并吃下、效果落到施法者身上是确定行为
 * （目标携带树果时 consumeHeld 取走并立刻结算效果），但舞台接口不暴露持有物与能力等级，故写进 note 供读轨迹判断；
 * 命中率与暴击同样不写断言。
 */
Smoke.scenario("pluck", function (stage) {
    var caster = stage.pokemon({ species: "Pidgeotto", level: 30, moves: ["pluck"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Geodude", level: 30, moves: ["tackle"], item: "cobblemon:sitrus_berry", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.casts("pluck", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("pluck", caster) > 0, "啄食被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "长喙啄到了目标身上");
        stage.note("目标携带文柚果（回复类树果），命中时树果应被啄走并立刻吃下，施法者获得该树果的效果（回血）；持有物与体力变化不被舞台接口读取，不写断言。",
            { casts: stage.casts("pluck", caster), damage: stage.damageTo(foe), movedBy: Math.round(stage.travelled(caster) * 10) / 10 });
        stage.done();
    }, "啄食命中并造成伤害");
});
