// 电磁飘浮的可执行设计说明：让一只电属性宝可梦对着地面属性的对手只起浮。
// 必然事实：电磁飘浮被放出来过；施法者自己带上了共享身份 world_combat:status/magnetrise。
// 地面招免疫与同极弹开需要一发地面招或一次贴地近战命中，本私有装配不含对应招式，写进 note 供完整装配试玩核对。
Smoke.scenario("magnetrise", function (stage) {
    var caster = stage.pokemon({ species: "magneton", level: 35, moves: ["magnetrise"], at: [-3, 0, 0] });
    // 岩石／地面属性的对手：伙伴 AI 的「躲地面招」把这种威胁当作起浮理由。
    var target = stage.pokemon({ species: "onix", level: 30, moves: [], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("magnetrise", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/magnetrise");
    }, function () {
        stage.expect(stage.casts("magnetrise", caster) > 0, "magnetrise was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/magnetrise"), "caster carried the shared magnetrise identity");
        stage.note("磁场挂上后免疫地面招与地形危害、贴地近战被弹开，都需要对应的来招；起浮时长、半径、电弧数量随等级/特攻/体重变化。持有黑色铁球时不生效。", {
            casts: stage.casts("magnetrise", caster), casterHp: caster.health()
        });
        stage.done();
    }, "magnetrise lifts the caster");
});
