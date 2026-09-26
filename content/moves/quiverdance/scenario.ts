/**
 * 蝶舞 / quiverdance 的可执行设计说明。
 *
 * 场面：一只只会「蝶舞」的彩粉蝶与一只弱小的小拉达隔开 10 格开战。它的技能表里只有这一招，所以 AI
 * 只能先起舞；有威胁且在起舞距离内时，它会先扬鳞再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/quiverdance 的鳞幕窗口。
 * 扬鳞拍数、实际左右点踏的距离、三项等级与窗口结束时只撤多少，都写进 note 供读轨迹判断（私有装配没有读取
 * 原生能力等级的读取原语，因此不断言具体级数；侧步读真实位移回执，贴墙缩步）。
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
            stage.note("flutter count, the real side-steps, the real Sp.Atk/Sp.Def/Speed stages and how much the window takes back are design facts read here; the private assembly has no reader for native stat stages", {
                casts: stage.casts("quiverdance", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "quiver dance is cast within 60 s");
});
