/** 破壳：以双防等级换取攻、特攻和速度；壳片飞散由粒子表现。 场景核对提交、状态或生命变化；表现由人工体验确认。 */
Smoke.scenario("shellsmash", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "cloyster", level: 45, moves: ["shellsmash"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [9, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("shellsmash", caster) > 0;
    }, function () {
        stage.expect(stage.casts("shellsmash", caster) > 0, "the shell smash was committed");
        stage.note("the move trades Defence and Special Defence stages for Attack, Special Attack and Speed; this scenario verifies the cast because the stage reader does not expose native stat stages", {
            casts: stage.casts("shellsmash", caster),
            foeCasts: stage.casts("tackle", foe),
            casterAlive: caster.alive(), casterHp: caster.health()
        });
        stage.done();
    }, "shell smash is cast within 60 s");
});
