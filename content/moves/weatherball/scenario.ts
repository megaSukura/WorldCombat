/**
 * 气象球的可执行设计说明：在雨天放这招，验证它被放出并造成伤害。
 * 雨天属水、威力 ×2（天色可收）；晴天属火、雷雨属电、无天气则普通。属性与威力都随天色变化，写进 note。
 * 命中率与暴击不写断言。
 */
Smoke.scenario("weatherball", function (stage) {
    stage.weather("rain");
    var castform = stage.pokemon({ species: "castform", level: 30, moves: ["weatherball"], at: [-6, 0, 0] });
    var geodude = stage.pokemon({ species: "geodude", level: 30, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(castform, geodude);
    stage.until(900, function () { return stage.casts("weatherball", castform) > 0 && stage.damageTo(geodude) > 0; }, function () {
        stage.expect(stage.casts("weatherball", castform) > 0, "气象球被放出来了");
        stage.expect(stage.damageTo(geodude) > 0, "球打到了目标身上");
        stage.note("雨天读作水属性、威力 ×2；晴天会读作火、雷雨读作电、无天气读作普通。命中率与暴击不写断言。",
            { casts: stage.casts("weatherball", castform), damage: stage.damageTo(geodude) });
        stage.done();
    }, "气象球命中并造成伤害");
});
