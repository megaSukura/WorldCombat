/**
 * 蝶舞 / quiverdance 的可执行设计说明。
 *
 * 场面：一只只会「蝶舞」的彩粉蝶与一只弱小的小拉达隔开 10 格开战。它的技能表里只有这一招，所以 AI
 * 只能先起舞；有威胁且在起舞距离内、且还能真的抬级时，它会先扬鳞再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/quiverdance 的鳞幕窗口；窗口出现时
 * 舞已跳完，特攻、特防、速度确实各抬起至少一级（强化在末拍才兑现）。
 * 扬鳞拍数、实际左右点踏的距离、窗口结束时只撤多少，都写进 note 供读轨迹判断；侧步读真实位移回执，贴墙或临空缩步。
 */
Smoke.scenario("quiverdance", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "vivillon", level: 32, moves: ["quiverdance"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 14, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("quiverdance", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/quiverdance");
    }, function () {
        stage.expect(stage.casts("quiverdance", caster) > 0, "the butterfly dance was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/quiverdance"), "the scale-veil window carried the shared identity");
        stage.after(80, function () {
            var ladder = stage.stages(caster);
            stage.expect((ladder.spa || 0) >= 1 && (ladder.spd || 0) >= 1 && (ladder.spe || 0) >= 1,
                "the completed dance raised Sp. Atk, Sp. Def and Speed");
            stage.note("flutter count, the real side-steps and the real Sp.Atk/Sp.Def/Speed stages read here; the veil window is only granted on the final beat", {
                casts: stage.casts("quiverdance", caster),
                stages: ladder,
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "quiver dance is cast within 60 s");
});
