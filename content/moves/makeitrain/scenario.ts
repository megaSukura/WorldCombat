/**
 * 淘金潮的可执行设计说明：让只会淘金潮的赛富豪站到两个原版生物中间倾下一场金雨。
 * 必然事实：本招被提交过；至少一个目标挨到了伤害；施法者随后仍然在场（自损不是即死）。
 * 自损特攻是宝可梦原生能力等级，读不到通用属性，因此只写进 note；命中几个、暴击、落地真币枚数是随机结果。
 */
Smoke.scenario("makeitrain", function (stage) {
    var caster = stage.pokemon({ species: "gholdengo", level: 50, moves: ["makeitrain"], at: [-3, 0, 0] });
    var first = stage.mob({ type: "minecraft:zombie", at: [0, 0, -1] });
    var second = stage.mob({ type: "minecraft:zombie", at: [1, 0, 1] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.until(900, function () { return stage.casts("makeitrain", caster) > 0 && (stage.damageTo(first) > 0 || stage.damageTo(second) > 0); }, function () {
        stage.expect(stage.casts("makeitrain", caster) > 0, "淘金潮被放出来了");
        stage.expect(stage.damageTo(first) > 0 || stage.damageTo(second) > 0, "金雨砸中了圈里的目标");
        stage.expect(caster.alive(), "倾库后施法者仍在场");
        stage.note("自身特攻下降是宝可梦原生能力等级，本场景读不到通用属性；命中几个、暴击与落地真币枚数是随机结果，只作记录。",
            { casts: stage.casts("makeitrain", caster), first: Math.round(stage.damageTo(first) * 10) / 10, second: Math.round(stage.damageTo(second) * 10) / 10 });
        stage.done();
    }, "金雨砸到目标");
});
