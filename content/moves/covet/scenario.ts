/**
 * 渴望的可执行设计说明：一只空手的猫，对一只携带道具的目标撒娇贴近。
 * 必然事实：本招被提交过、目标受过伤（撒娇的一贴命中）。夺取与降攻是确定行为
 * （自己空手、双方都是宝可梦、目标持物时道具换手；每记落地降攻 1 级），
 * 但舞台接口不暴露持有物与能力等级，故写进 note 供读轨迹判断；命中率与暴击同样不写断言。
 */
Smoke.scenario("covet", function (stage) {
    var caster = stage.pokemon({ species: "Purrloin", level: 30, moves: ["covet"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Geodude", level: 30, moves: ["tackle"], item: "cobblemon:oran_berry", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.casts("covet", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("covet", caster) > 0, "渴望被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "撒娇的一贴打到了目标身上");
        stage.note("自己空手、目标是携带树果的宝可梦，命中时道具应换到施法者手里；每记落地还会让目标攻击下降 1 级。持有物与能力等级不被舞台接口读取，不写断言。",
            { casts: stage.casts("covet", caster), damage: stage.damageTo(foe) });
        stage.done();
    }, "渴望命中并造成伤害");
});
