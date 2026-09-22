// 顺风的执行性设计说明：这是一招托住全队的动作，所以场面要有队友、也要有让 AI 起风的威胁。
// 必然事实：施法者提交过顺风；施法者与半径内的队友身上都出现过共享身份 world_combat:status/tailwind。
// 具体提速等级随速度与配置变化，属于随机/环境结果，写进 note 供自己读轨迹。
Smoke.scenario("tailwind", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "pidgey", level: 34, moves: ["tailwind"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    // 两个敌人：一个盯住伙伴（伙伴因此真的出手，威胁因此成立），一个盯住施法者（施法者有威胁可读）。
    var foeAlly = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [7, 0, 0] });
    var foeCaster = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [4, 0, 4] });
    stage.team("gale", [caster, ally]);
    stage.hostile(ally, foeAlly);
    stage.hostile(caster, foeCaster);

    stage.until(900, function () {
        return stage.casts("tailwind", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/tailwind");
    }, function () {
        stage.expect(stage.casts("tailwind", caster) > 0, "tailwind was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/tailwind"), "caster rode the shared tailwind identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/tailwind"), "the nearby ally rode the shared tailwind identity");
        stage.note("顺风以施法者为锚，提交时把半径内的友方一起托住并写进公共能力阶梯；提速等级随速度与配置（广风/长风）变化，实际数值留给完整装配试玩核对。", {
            casts: stage.casts("tailwind", caster), casterHp: caster.health(), allyHp: ally.health(), tick: stage.tick()
        });
        stage.done();
    }, "tailwind lifts the pair");
});
