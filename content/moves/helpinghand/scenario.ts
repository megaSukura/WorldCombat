// 帮助的可执行设计说明：这招把一次托举留给伙伴的下一次直接命中。
// 必然事实：施法者提交过帮助；伙伴身上出现过共享身份 world_combat:status/helpinghand；
//   间接/持续伤害不消耗这份力；一次真正的直接正伤害命中才用掉它，且这一下比同一目标上的无帮助直接命中更重。
// 护盾/无敌拒伤、驱散再施、多人重复托举与真实观感属于时机与人工判断，写进 note。
Smoke.scenario("helpinghand", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "eevee", level: 32, moves: ["helpinghand"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [0, 0, 0] });
    // 两个敌人：一个盯住伙伴、一个盯住施法者，施法者因此有威胁可读；伙伴不带招式，不会自行把这份力用掉。
    var foeAlly = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [8, 0, 0] });
    var foeCaster = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [5, 0, 4] });
    stage.team("help", [caster, ally]);
    stage.hostile(ally, foeAlly);
    stage.hostile(caster, foeCaster);

    function help(): boolean { return stage.hasMobEffect(ally, "world_combat:status/helpinghand"); }
    var direct = { kind: "move", category: "physical", contact: true, type: "normal", critical: false, bypassAccuracy: true, bypassCooldown: true };

    stage.until(900, function () {
        return stage.casts("helpinghand", caster) > 0 && help();
    }, function () {
        stage.expect(help(), "the ally carried the shared helpinghand identity");
        // 由被帮助者造成的间接/持续伤害不应消耗这份力。
        stage.after(2, function () {
            var residualBefore = stage.damageTo(foeAlly);
            stage.hurt(foeAlly, 4, "minecraft:generic", { source: ally,
                metadata: { kind: "residual", indirect: true, bypassAccuracy: true, bypassCooldown: true } });
            stage.after(2, function () {
                stage.expect(stage.damageTo(foeAlly) > residualBefore, "residual damage still lands on the foe");
                stage.expect(help(), "indirect/residual damage does not spend the borrowed strength");
                // 同一目标上的无帮助直接命中作为基线（施法者身上没有这份力）。
                var baselineBefore = stage.damageTo(foeAlly);
                stage.hurt(foeAlly, 6, "minecraft:mob_attack", { source: caster, metadata: direct });
                var baseline = stage.damageTo(foeAlly) - baselineBefore;
                // 伙伴的直接命中才是兑现点：更重，并用掉这份力。
                var helpedBefore = stage.damageTo(foeAlly);
                stage.hurt(foeAlly, 6, "minecraft:mob_attack", { source: ally, metadata: direct });
                var helped = stage.damageTo(foeAlly) - helpedBefore;
                stage.after(2, function () {
                    stage.expect(helped > 0, "the ally's direct hit landed");
                    stage.expect(helped > baseline, "the borrowed strength made the ally's direct hit heavier");
                    stage.expect(!help(), "one direct damaging hit spent the borrowed strength");
                    stage.note("帮助在伙伴身上留下共享身份与一份一次预约；间接/持续伤害不消耗，只有一次真正的直接正伤害命中才在回执里扣掉并带出命中特效，且这一下重于同一目标上的无帮助直接命中。护盾/无敌拒伤、驱散再施、多人重复托举、玩家与普通MC同伴以及加成倍率的观感留给完整装配人工试玩。托举距离/强度/时长分别随速度、物攻特攻、亲密度与等级变化。", {
                        casterCasts: stage.casts("helpinghand", caster), residual: stage.damageTo(foeAlly) - helped - baseline,
                        baseline: baseline, helped: helped, tick: stage.tick() });
                    stage.done();
                });
            });
        });
    }, "helping hand lends to the ally");
});
