/**
 * 拍落的可执行设计说明：一只会拍落的精灵，对一只携带剩饭的目标出手。
 * 必然事实：本招被提交过、目标受过伤（重拍命中）。道具被拍掉并在世界里生成掉落物是确定行为，
 * 但舞台接口不暴露掉落物与持有物，故写进 note 供读轨迹判断；命中率与暴击同样不写断言。
 */
Smoke.scenario("knockoff", function (stage) {
    var caster = stage.pokemon({ species: "Machop", level: 30, moves: ["knockoff"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Geodude", level: 30, moves: ["tackle"], item: "cobblemon:leftovers", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.casts("knockoff", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("knockoff", caster) > 0, "拍落被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "重拍打到了目标身上");
        stage.note("目标是携带剩饭的宝可梦，命中时道具应被取走并以掉落物抛向拍击方向、延时后才可捡起；持有物与掉落物不被舞台接口读取，不写断言。",
            { casts: stage.casts("knockoff", caster), damage: stage.damageTo(foe) });
        stage.done();
    }, "拍落命中并造成伤害");
});
