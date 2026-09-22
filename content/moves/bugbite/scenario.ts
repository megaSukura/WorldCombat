/**
 * 虫咬的可执行设计说明：一只虫属性咬击手，对一只携带树果的目标出手。
 * 必然事实：本招被提交过、目标受过伤（咬合命中）。树果被咬下并吃下、效果落到施法者身上是确定行为
 * （目标携带树果时 consumeHeld 取走并结算效果），但舞台接口不暴露持有物与能力等级，故写进 note 供读轨迹判断；
 * 命中率与暴击同样不写断言。
 */
Smoke.scenario("bugbite", function (stage) {
    var caster = stage.pokemon({ species: "Scyther", level: 30, moves: ["bugbite"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Geodude", level: 30, moves: ["tackle"], item: "cobblemon:liechi_berry", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.casts("bugbite", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("bugbite", caster) > 0, "虫咬被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "咬合打到了目标身上");
        stage.note("目标携带枝荔果（能力提升类树果），命中时树果应被咬走并吃掉，施法者获得该树果的效果（攻击提升）；持有物与能力等级不被舞台接口读取，不写断言。",
            { casts: stage.casts("bugbite", caster), damage: stage.damageTo(foe) });
        stage.done();
    }, "虫咬命中并造成伤害");
});
