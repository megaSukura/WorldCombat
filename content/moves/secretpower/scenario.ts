/**
 * 秘密之力的可执行设计说明：让会借力的一只精灵在草地上贴身打一名目标，验证它会突进、
 * 造成伤害并顶开。命中后抽到什么场所效果取决于随机概率与水/草/火地形，属随机结果，写进 note。
 */
Smoke.scenario("secretpower", function (stage) {
    var sentret = stage.pokemon({ species: "sentret", level: 30, moves: ["secretpower"], at: [-7, 0, 0] });
    var rattata = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [0, 0, 0] });
    stage.fill([-3, -1, -3], [3, -1, 3], "minecraft:short_grass");
    stage.hostile(sentret, rattata);
    stage.until(700, function () { return stage.casts("secretpower", sentret) > 0 && stage.damageTo(rattata) > 0; }, function () {
        stage.expect(stage.casts("secretpower", sentret) > 0, "秘密之力被放出来了");
        stage.expect(stage.damageTo(rattata) > 0, "借力一击打到了目标身上");
        stage.expect(stage.travelled(sentret) > 0, "借力的突进把施法者带向了目标");
        stage.note("命中点在草地上时为睡眠；追加是否抽中、以及命中/暴击都是随机结果。",
            { casts: stage.casts("secretpower", sentret), damage: stage.damageTo(rattata),
                slept: stage.hadMobEffect(rattata, "world_combat:status/sleep"), travelled: stage.travelled(sentret) });
        stage.done();
    }, "秘密之力命中并造成伤害");
});
