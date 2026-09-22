// 指导的执行性设计说明：这是一招必须选一个伙伴的整队强化，所以场面要有伙伴、也要有让 AI 出手的威胁。
// 必然事实：施法者提交过指导；被指导的伙伴身上出现过共享身份 world_combat:status/coaching。
// 具体抬到几级、向旁边传给几人随数据与走位变化，写进 note。
Smoke.scenario("coaching", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "machop", level: 36, moves: ["coaching"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    var foeAlly = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [7, 0, 0] });
    var foeCaster = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [4, 0, 4] });
    stage.team("drill", [caster, ally]);
    stage.hostile(ally, foeAlly);
    stage.hostile(caster, foeCaster);

    stage.until(900, function () {
        return stage.casts("coaching", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/coaching");
    }, function () {
        stage.expect(stage.casts("coaching", caster) > 0, "coaching was cast");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/coaching"), "the coached ally carried the shared coaching identity");
        stage.note("指导必须选一个伙伴；提交后受教者攻防各抬一档，身边传授半径内听清的友方一起领会。实际级数与传开的人数随等级/防御/特攻与走位变化，留给完整装配试玩核对。", {
            casts: stage.casts("coaching", caster), casterHp: caster.health(), allyHp: ally.health(), tick: stage.tick()
        });
        stage.done();
    }, "coaching reaches the ally");
});
