/**
 * 灵骚的可执行设计说明：一只幽灵精灵，对一只携带道具的目标出手；目标是宝可梦，因此持有物存在、招式可以成立。
 * 必然事实：本招被提交过、目标受过伤（道具砸回命中）。目标空手时起手即失败（另一条路径，不在本场景断言）。
 * 命中率（原生 90）与暴击不写断言，写进 note。
 */
Smoke.scenario("poltergeist", function (stage) {
    var caster = stage.pokemon({ species: "Gengar", level: 30, moves: ["poltergeist"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Geodude", level: 30, moves: ["tackle"], item: "cobblemon:leftovers", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.casts("poltergeist", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("poltergeist", caster) > 0, "灵骚被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "被操纵的道具砸回了目标");
        stage.note("目标是携带剩饭的宝可梦，道具被操纵后仍留在它手里（原生不取走）；命中率 90 与暴击不写断言。",
            { casts: stage.casts("poltergeist", caster), damage: stage.damageTo(foe) });
        stage.done();
    }, "灵骚命中并造成伤害");
});
