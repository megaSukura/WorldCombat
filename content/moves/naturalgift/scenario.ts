/**
 * 自然之恩的可执行设计说明：给一只会这招的精灵带上树果，让它对目标出手，验证它会踏前命中并造成伤害。
 * 伤害属性与威力来自携带的 cheri_berry（火／80）与物攻成长；命中后树果被吃掉，因此只断言第一击。
 * 命中率、暴击与具体威力不写断言，写进 note。
 */
Smoke.scenario("naturalgift", function (stage) {
    var aipom = stage.pokemon({ species: "aipom", level: 30, moves: ["naturalgift"], item: "cobblemon:cheri_berry", at: [-2, 0, 0] });
    var geodude = stage.pokemon({ species: "geodude", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(aipom, geodude);
    stage.until(900, function () { return stage.casts("naturalgift", aipom) > 0 && stage.damageTo(geodude) > 0; }, function () {
        stage.expect(stage.casts("naturalgift", aipom) > 0, "自然之恩被放出来了");
        stage.expect(stage.damageTo(geodude) > 0, "树果一击打到了目标身上");
        stage.note("伤害属性与威力来自携带的 cheri_berry（火／80），命中后树果被消耗，所以只可能放一次有效攻击；命中率、暴击与物攻成长不写断言。",
            { casts: stage.casts("naturalgift", aipom), damage: stage.damageTo(geodude), travelled: stage.travelled(aipom) });
        stage.done();
    }, "自然之恩命中并造成伤害");
});
