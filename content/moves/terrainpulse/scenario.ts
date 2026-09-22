/**
 * 大地波动的可执行设计说明：让一只会这招的精灵对目标出手，验证它推出一道地波并造成伤害。
 * 本场景没有场地来源（smoke 只装配本单元与共享包），因此这一波读作普通属性、威力不翻倍；
 * 场地分支需要集成环境里已有电气／青草／薄雾／精神场地时才成立，写进 note。命中率与暴击不写断言。
 */
Smoke.scenario("terrainpulse", function (stage) {
    var snorlax = stage.pokemon({ species: "snorlax", level: 30, moves: ["terrainpulse"], at: [-6, 0, 0] });
    var geodude = stage.pokemon({ species: "geodude", level: 30, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(snorlax, geodude);
    stage.until(900, function () { return stage.casts("terrainpulse", snorlax) > 0 && stage.damageTo(geodude) > 0; }, function () {
        stage.expect(stage.casts("terrainpulse", snorlax) > 0, "大地波动被放出来了");
        stage.expect(stage.damageTo(geodude) > 0, "地波打到了目标身上");
        stage.note("无场地时读作普通属性、威力为 50 左右；站在电气／青草／薄雾／精神场地上（WorldEffects.field 的对应规则）时属性随场地、威力 ×2，悬空则不变。共鸣配置会补第二波。命中率与暴击不写断言。",
            { casts: stage.casts("terrainpulse", snorlax), damage: stage.damageTo(geodude) });
        stage.done();
    }, "大地波动命中并造成伤害");
});
