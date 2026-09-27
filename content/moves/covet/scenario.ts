/**
 * 渴望的可执行设计说明：一只空手的猫，对一只携带道具、站定不动的目标撒娇贴近。
 * 必然事实：本招被提交过、目标受过伤（撒娇的一贴命中）。夺取与降攻是确定行为
 * （自己空手、双方都是宝可梦、目标持物时道具按空接收槽的原子转移换手；每记落地按实际等级降攻），
 * 但舞台接口不暴露持有物与能力等级，故写进 note 供读轨迹判断；命中率与暴击同样不写断言。
 * 目标用不会还手、也不移动的精灵，避免走位让这段短贴落空——那是场景布置，不是断言放宽。
 */
Smoke.scenario("covet", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Purrloin", level: 30, moves: ["covet"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 45, moves: ["splash"], item: "cobblemon:oran_berry", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () { return stage.casts("covet", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("covet", caster) > 0, "渴望被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "撒娇的一贴打到了目标身上");
        stage.note("自己空手、目标是携带树果的宝可梦，命中时道具应换到施法者手里；每记落地还会让目标攻击实际下降。持有物与能力等级不被舞台接口读取，不写断言。",
            { casts: stage.casts("covet", caster), damage: stage.damageTo(foe) });
        stage.done();
    }, "渴望命中并造成伤害");
});
