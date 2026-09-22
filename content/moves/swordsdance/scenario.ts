/**
 * 剑舞 / swordsdance 的可执行设计说明。
 *
 * 场面：一只只会「剑舞」的飞天螳螂与一只弱小的小拉达隔开 10 格开战。它的技能表里只有这一招，所以 AI
 * 只能先起舞；有威胁且在起舞距离内时，它会先磨刃再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/swordsdance 的磨刃窗口。
 * 连斩数、是否进逼、物攻等级是否真的抬到 +2、窗口结束时收回多少，都写进 note 供读轨迹判断（私有装配没有
 * 读取原生能力等级的读取原语，因此不断言具体级数）。
 */
Smoke.scenario("swordsdance", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "scyther", level: 32, moves: ["swordsdance"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 14, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("swordsdance", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/swordsdance");
    }, function () {
        stage.expect(stage.casts("swordsdance", caster) > 0, "the war dance was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/swordsdance"), "the honed window carried the shared identity");
        stage.after(80, function () {
            stage.note("cut count, press, the real attack stages and how much the window takes back are design facts read here; the private assembly has no reader for native stat stages", {
                casts: stage.casts("swordsdance", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "swords dance is cast within 60 s");
});
