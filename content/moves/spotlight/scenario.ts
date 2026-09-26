// 聚光灯的可执行设计说明：这是一招把任意生物标成焦点的控制，所以场面要有目标，也要有会被牵过去的生物。
// 必然事实：施法者提交过聚光灯；目标身上出现过共享身份 world_combat:status/spotlight。
// 「空点拒绝、需要看得见的生物目标」由 ready 校验；按阵营关系改目标与易伤是持续效果，属完整装配观察项，写进 note。
Smoke.scenario("spotlight", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "chinchou", level: 32, moves: ["spotlight"], at: [-3, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 28, moves: [], at: [4, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [9, 0, 0] });
    stage.team("beam", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        // 等过第一个 sweep（mark 起点 +20 刻），让按阵营改目标与持续亮光的接戏路径真实跑一遍。
        return stage.tick() >= 140 && stage.casts("spotlight", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/spotlight");
    }, function () {
        stage.expect(stage.casts("spotlight", caster) > 0, "the caster shone the spotlight");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/spotlight"), "the foe carried the shared spotlight identity");
        stage.note("目标可选友方或敌方；空点与自身由 ready 拒绝。照明期间被照者受到的伤害 ×(1+expose)，mark 每 20 刻把被照者周围与它敌对的生物指向它（world.target），world.target 拒绝的 Boss 不会被改目标、也不画线。暴露加成、照明时长、扫过范围与光点数分别随特攻、等级、速度与体型变化，照应友军的 AI 由 ai.assist 控制，兑现留给完整装配的人工试玩。", {
            casterCasts: stage.casts("spotlight", caster), foeDamage: Math.round(stage.damageTo(foe) * 10) / 10, tick: stage.tick()
        });
        stage.done();
    }, "spotlight marked the foe");
});
