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
        stage.after(5, function () {
            var stages = stage.stages(caster);
            stage.expect(stage.casts("shellsmash", caster) > 0, "the shell smash was committed");
            stage.expect(stages.atk > 0 && stages.spa > 0 && stages.spe > 0, "the smash raised Attack, Special Attack and Speed");
            stage.expect(stages.def < 0 && stages.spd < 0, "the broken shell lowered Defence and Special Defence");
            stage.note("the same move pays Defence/Special Defence stages for Attack/Special Attack/Speed; the numbers depend on the config (steady vs full) and body size, and the stages cap at +6/-6 or stop early when a stat-drop immunity applies", {
                casts: stage.casts("shellsmash", caster),
                stages: stages,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive(), casterHp: caster.health()
            });
            stage.done();
        });
    }, "shell smash is cast within 60 s");
});
