// 反射壁的可执行设计说明：这是一圈罩住自己与队友的物理屏障，所以场面要有队友、也要有让 AI 立壁的威胁。
// 必然事实：反射壁被放出来过；施法者与半径内的队友身上都出现过共享身份 world_combat:status/reflect。
// 物理被削减、镜面反弹需要一次真实物理命中，属随机结果，写进 note 供完整装配试玩核对。
Smoke.scenario("reflect", function (stage) {
    var caster = stage.pokemon({ species: "drowzee", level: 34, moves: ["reflect"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "machop", level: 24, moves: ["tackle"], at: [5, 0, 0] });
    stage.team("plated", [caster, ally]);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("reflect", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/reflect") && stage.hadMobEffect(ally, "world_combat:status/reflect");
    }, function () {
        stage.expect(stage.casts("reflect", caster) > 0, "reflect was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/reflect"), "caster carried the shared reflect identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/reflect"), "the nearby ally carried the shared reflect identity");
        stage.note("反射壁以施法者为锚，提交时与之后每 20 刻把同一面壁补给半径内的友方；物理伤害在结算前按 cut 削减，镜面形态把近身物理挡下的部分弹回攻击者（命中与形态是随机/配置结果，留给完整装配试玩）。时长、半径、板数随防御/身高/等级变化，镜面与坚壁各有取舍。", {
            casts: stage.casts("reflect", caster), casterHp: caster.health(), allyHp: ally.health()
        });
        stage.done();
    }, "reflect covers the pair");
});
