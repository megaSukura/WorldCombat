// 指导的执行性设计说明：这是一招必须选一个伙伴的定点强化。前排两个伙伴挨在一起，主受教者身边的伙伴会一起领会。
// 必然事实：施法者提交过指导；被指导的伙伴与它身边的伙伴都出现过共享身份 world_combat:status/coaching；
// 老师自己绝不进入旁听范围（不会隔墙自吃回授）。具体抬到几级、旁听几人随数据与走位变化，写进 note。
Smoke.scenario("coaching", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "machop", level: 36, moves: ["coaching"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    var mate = stage.pokemon({ species: "eevee", level: 28, moves: ["tackle"], at: [1.5, 0, 0] });
    var foeAlly = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [7, 0, 0] });
    var foeCaster = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [4, 0, 4] });
    stage.team("drill", [caster, ally, mate]);
    stage.hostile(ally, foeAlly);
    stage.hostile(mate, foeAlly);
    stage.hostile(caster, foeCaster);

    stage.until(900, function () {
        return stage.casts("coaching", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/coaching")
            && stage.hadMobEffect(mate, "world_combat:status/coaching");
    }, function () {
        stage.expect(stage.casts("coaching", caster) > 0, "coaching was cast");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/coaching"), "the coached ally carried the shared coaching identity");
        stage.expect(stage.hadMobEffect(mate, "world_combat:status/coaching"), "the mate beside the coached ally learned too");
        stage.expect(!stage.hadMobEffect(caster, "world_combat:status/coaching"), "the coach never took the lesson back");
        stage.note("指导必须选一个伙伴；提交后把一段 boostWindow 挂在受教者这次的 carrier 上，攻防各抬一档，然后以受教者为阵心、对通视且在旁听名额内的友方同样处理。两个伙伴挨在一起，无论先教到谁，另一个都在同一圈里；老师自己不在旁听之列。实际级数与传开的人数随等级/防御/特攻与走位变化，留给完整装配试玩核对。", {
            casts: stage.casts("coaching", caster), casterHp: caster.health(), allyHp: ally.health(),
            mateHp: mate.health(), tick: stage.tick()
        });
        stage.done();
    }, "coaching reaches the ally and its mate");
});
