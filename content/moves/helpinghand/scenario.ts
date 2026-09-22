// 帮助的可执行设计说明：这是一招托举队友的动作，所以场面要有队友、也要有让 AI 出手的威胁。
// 必然事实：施法者提交过帮助；伙伴身上出现过共享身份 world_combat:status/helpinghand。
// 伤害加成需要伙伴在窗口内命中一次（命中与否是随机/时机结果），写进 note。
Smoke.scenario("helpinghand", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "eevee", level: 32, moves: ["helpinghand"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [0, 0, 0] });
    // 两个敌人：一个盯住伙伴（伙伴因此真的出手，才有机会把帮助用掉），一个盯住施法者（施法者因此有威胁可读）。
    var foeAlly = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [8, 0, 0] });
    var foeCaster = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [5, 0, 4] });
    stage.team("help", [caster, ally]);
    stage.hostile(ally, foeAlly);
    stage.hostile(caster, foeCaster);

    stage.until(900, function () {
        return stage.casts("helpinghand", caster) > 0 && stage.hadMobEffect(ally, "world_combat:status/helpinghand");
    }, function () {
        stage.expect(stage.casts("helpinghand", caster) > 0, "the caster lent a hand to its ally");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/helpinghand"), "the ally carried the shared helpinghand identity");
        // 再等一会儿，让伙伴有机会真的出手，把这份力用掉；命中与否不是必然事实，只写进 note。
        stage.after(160, function () {
            stage.note("帮助把身份与加成挂在伙伴身上；伙伴下一次命中时入场规则把伤害 ×(1+assist) 并用掉这份力。是否真的打中、加成了多少由时机与随机决定，留给完整装配的人工试玩。托举距离/强度/时长分别随速度、物攻特攻、亲密度与等级变化。", {
                casterCasts: stage.casts("helpinghand", caster), allyHurt: Math.round(stage.damageTo(ally) * 10) / 10,
                foeDamage: Math.round(stage.damageTo(foeAlly) * 10) / 10, tick: stage.tick()
            });
            stage.done();
        });
    }, "helping hand lends to the ally");
});
