/**
 * 淘金潮的可执行设计说明：让只会淘金潮的赛富豪站到一只点住不动的铁傀儡和一只僵尸旁边，向身周倾一场金雨。
 * 夜间施放，僵尸不会被日光灼烧，`damageBy(caster)` 只可能来自这一招。
 * 必然事实：本招被提交过；施法者真的用这一招造成了伤害；施法者随后仍然在场（自损不是即死）。
 * 每名敌人整次最多被结算一次、束数随速度／等级与倾库式变化、落地真币枚数与是否被方块截住，都是随机或
 * 位置相关的结果，只写进 note；自损特攻是宝可梦原生能力等级，本场景读不到通用属性。
 */
Smoke.scenario("makeitrain", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gholdengo", level: 50, moves: ["makeitrain"], at: [-3, 0, 0] });
    var first = stage.mob({ type: "minecraft:iron_golem", at: [-1, 0, 0] });
    var second = stage.mob({ type: "minecraft:zombie", at: [-1, 0, 2] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1400, function () {
        return stage.casts("makeitrain", caster) > 0 && stage.damageBy(caster) > 0;
    }, function () {
        stage.expect(stage.casts("makeitrain", caster) > 0, "淘金潮被放出来了");
        stage.expect(stage.damageBy(caster) > 0, "金雨的真实轨迹砸中了圈里的目标");
        stage.expect(caster.alive(), "倾库后施法者仍在场");
        stage.note("每名敌人整次最多被结算一次；命中几个、暴击、落地真币枚数与是否被方块截住都是随机/位置结果，只作记录。",
            { casts: stage.casts("makeitrain", caster), dealt: Math.round(stage.damageBy(caster) * 10) / 10,
                first: Math.round(stage.damageTo(first) * 10) / 10,
                second: Math.round(stage.damageTo(second) * 10) / 10, changed: stage.changedBlocks().length });
        stage.done();
    }, "金雨砸到目标");
});
