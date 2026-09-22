/**
 * 小偷的可执行设计说明：一只空手的快精灵，对一只携带毒针的目标出手。
 * 必然事实：本招被提交过、目标受过伤（探手命中）。道具换手是确定行为（自己空手、双方都是宝可梦、目标持物），
 * 但舞台接口不暴露持有物，故把“是否换手”写进 note 供读轨迹判断；命中率与暴击同样不写断言。
 */
Smoke.scenario("thief", function (stage) {
    var caster = stage.pokemon({ species: "Purrloin", level: 30, moves: ["thief"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Geodude", level: 30, moves: ["tackle"], item: "cobblemon:poison_barb", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.casts("thief", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("thief", caster) > 0, "小偷被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "探手打到了目标身上");
        stage.note("自己空手、目标是携带毒针的宝可梦，命中时道具应换到施法者手里（持有物不被舞台接口读取，不写断言）。",
            { casts: stage.casts("thief", caster), damage: stage.damageTo(foe) });
        stage.done();
    }, "小偷命中并造成伤害");
});
