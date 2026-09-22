// 重力的可执行设计说明：让一只会重力的宝可梦对着飞行属性的对手压下一口重力井。
// 必然事实：重力被放出来过；井里的活体（压在对手身上的井会罩住它）身上出现过共享身份 world_combat:status/gravity。
// 拽落、拔浮空与凌空招式封锁需要空中的活体或凌空招式，属随机/环境结果，写进 note 供完整装配试玩核对。
Smoke.scenario("gravity", function (stage) {
    stage.weather("clear");
    stage.time("day");
    const caster = stage.pokemon({ species: "clefable", level: 32, moves: ["gravity"], at: [-3, 0, 0] });
    const flier = stage.pokemon({ species: "pidgeotto", level: 22, moves: [], at: [3, 0, 0] });
    stage.hostile(caster, flier);
    stage.until(900, function () {
        return stage.casts("gravity", caster) > 0
            && (stage.hadMobEffect(caster, "world_combat:status/gravity") || stage.hadMobEffect(flier, "world_combat:status/gravity"));
    }, function () {
        stage.expect(stage.casts("gravity", caster) > 0, "gravity was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/gravity") || stage.hadMobEffect(flier, "world_combat:status/gravity"),
            "a body inside the well carried the shared gravity identity");
        stage.note("井压在对手身上（ai.atFoe 默认开启）；坠地、拔浮空与凌空招式封锁都需要真实离地/凌空招式，留给完整装配试玩。井半径随体重/防御、拽落随体重/攻击、持续时间随等级变化。", {
            casts: stage.casts("gravity", caster),
            casterWell: stage.hadMobEffect(caster, "world_combat:status/gravity"),
            flierWell: stage.hadMobEffect(flier, "world_combat:status/gravity")
        });
        stage.done();
    }, "the gravity well presses down");
});
