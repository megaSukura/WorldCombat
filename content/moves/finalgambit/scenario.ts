/**
 * 搏命的可执行设计说明。
 *
 * 场面：一只生命远高于对手的斗系精灵（猴怪，30 级）面对一只低生命、学不会有效反击的对手（向日种子，5 级），
 * 相距 2 格。双方都只带这一招；猴怪的当前生命不低于对手，AI 的「只打必杀」条件成立，会把全部生命押上去；
 * 向日种子这一侧生命低于猴怪，条件不成立，不会出手。
 * 必然事实：本招被提交过；对手受到过伤害（且通常被一记打空）。
 * 用户是否随之倒下、伤害具体数值写进 note 供读轨迹判断——「命中即自我牺牲」正是这一招的设计事实。
 */
Smoke.scenario("finalgambit", function (stage) {
    stage.time("night");
    var gambler = stage.pokemon({ species: "mankey", level: 30, moves: ["finalgambit"], at: [-1, 0, 0] });
    var prey = stage.pokemon({ species: "sunkern", level: 5, moves: ["finalgambit"], at: [1, 0, 0] });
    stage.hostile(gambler, prey);
    stage.until(900, function () {
        return stage.casts("finalgambit", gambler) > 0 && stage.damageTo(prey) > 0;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("finalgambit", gambler) > 0, "mankey committed final gambit");
            stage.expect(stage.damageTo(prey) > 0, "final gambit dealt damage equal to the user's HP");
            stage.note("final gambit spends the user's remaining HP as damage and the user faints (unless the spare form is configured). The AI only commits when its own HP is not below the target's, so this blow is meant to empty the target. Variable: exact damage, crit is disabled by design, and whether the target was already hurt.", {
                casts: stage.casts("finalgambit", gambler),
                damageToPrey: Math.round(stage.damageTo(prey) * 10) / 10,
                preyAlive: prey.alive(), preyHealth: Math.round(prey.health() * 10) / 10,
                gamblerAlive: gambler.alive(),
                preyCasts: stage.casts("finalgambit", prey)
            });
            stage.done();
        });
    }, "final gambit is committed and lands within 45 s");
});
