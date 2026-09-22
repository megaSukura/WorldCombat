/**
 * 杂技的可执行设计说明：一只空手的飞身精灵，对一只僵尸出手（夜晚，僵尸不会被日光灼烧，伤害只来自本招）。
 * 必然事实：本招被提交过、目标受过伤（翻滚命中）。空手翻倍是确定行为（施法者未携带道具），
 * 但伤害数值同时受命中率、暴击与相性影响，故把翻倍写进 note 供读轨迹判断，不写断言。
 */
Smoke.scenario("acrobatics", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Hawlucha", level: 30, moves: ["acrobatics"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.casts("acrobatics", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("acrobatics", caster) > 0, "杂技被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "翻滚撞到了目标身上");
        stage.note("施法者空手，本击威力按 ×2 计算；命中率、暴击与相性不写断言。",
            { casts: stage.casts("acrobatics", caster), damage: stage.damageTo(foe), moved: Math.round(stage.travelled(caster) * 10) / 10 });
        stage.done();
    }, "杂技命中并造成伤害");
});
