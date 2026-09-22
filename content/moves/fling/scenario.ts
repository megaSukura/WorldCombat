/**
 * 投掷的可执行设计说明：给一只会这招的精灵带上毒针，让它对目标出手，验证它把道具甩出去并造成伤害。
 * 毒针命中后以 100% 概率让目标中毒，共享身份是 world_combat:status/poison，因此额外断言该身份出现过。
 * 落地留下的道具不写断言（需要玩家或脚本去捡），命中率与暴击写进 note。
 */
Smoke.scenario("fling", function (stage) {
    var aipom = stage.pokemon({ species: "aipom", level: 30, moves: ["fling"], item: "cobblemon:poison_barb", at: [-5, 0, 0] });
    var geodude = stage.pokemon({ species: "geodude", level: 30, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(aipom, geodude);
    stage.until(900, function () { return stage.casts("fling", aipom) > 0 && stage.damageTo(geodude) > 0 && stage.hadMobEffect(geodude, "world_combat:status/poison"); }, function () {
        stage.expect(stage.casts("fling", aipom) > 0, "投掷被放出来了");
        stage.expect(stage.damageTo(geodude) > 0, "甩出的道具打到了目标身上");
        stage.expect(stage.hadMobEffect(geodude, "world_combat:status/poison"), "毒针命中后目标中毒");
        stage.note("毒针投掷威力 70、命中后 100% 中毒；落地道具默认留在世界里（leave 默认开），需玩家或脚本去捡。命中率与暴击不写断言。",
            { casts: stage.casts("fling", aipom), damage: stage.damageTo(geodude) });
        stage.done();
    }, "投掷命中、造成伤害并使目标中毒");
});
