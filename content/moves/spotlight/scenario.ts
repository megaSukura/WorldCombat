// 聚光灯的可执行设计说明：这是一招把对手标成焦点的控制，所以场面要有对手，也要有能被牵过去的同伴。
// 必然事实：施法者提交过聚光灯；对手身上出现过共享身份 world_combat:status/spotlight。
// 伤害加成与「把原版生物指向它」是持续效果，属完整装配观察项，写进 note。
Smoke.scenario("spotlight", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "chinchou", level: 32, moves: ["spotlight"], at: [-3, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 28, moves: [], at: [4, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [9, 0, 0] });
    stage.team("beam", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("spotlight", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/spotlight");
    }, function () {
        stage.expect(stage.casts("spotlight", caster) > 0, "the caster shone the spotlight");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/spotlight"), "the foe carried the shared spotlight identity");
        stage.note("被照亮的对手在照明期间受到的伤害 ×(1+expose)，并由 mark 每 20 刻把施法者一侧的原版生物指向它（world.target）；脚本化的伙伴 AI 仍按自己的交战逻辑行动。暴露加成、照明时长、扫过范围与光点数分别随特攻、等级、速度与体型变化，兑现留给完整装配的人工试玩。", {
            casterCasts: stage.casts("spotlight", caster), foeDamage: Math.round(stage.damageTo(foe) * 10) / 10, tick: stage.tick()
        });
        stage.done();
    }, "spotlight marked the foe");
});
