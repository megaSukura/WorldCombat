/**
 * 胜利之舞 / victorydance 的可执行设计说明。
 *
 * 场面：一只只会「胜利之舞」的洗翠裙儿小姐与一只弱小的小拉达隔开 10 格开战（洗翠形态是这招在已实装物种里
 * 唯一的学习者）。它的技能表里只有这一招，所以 AI 只能先起舞；有威胁且在起舞距离内时，它会先立冠再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/victorydance 的凯旋窗口。
 * 踏步拍数、是否隆重、三项等级是否真的抬到 +1、命中是否把窗口延续、窗口结束时收回多少，都写进 note 供读轨迹
 * 判断（私有装配没有读取原生能力等级的读取原语，因此不断言具体级数）。
 */
Smoke.scenario("victorydance", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "lilligant", level: 32, properties: "aspect=hisuian", moves: ["victorydance"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 14, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("victorydance", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/victorydance");
    }, function () {
        stage.expect(stage.casts("victorydance", caster) > 0, "the victory rite was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/victorydance"), "the crown window carried the shared identity");
        stage.after(80, function () {
            stage.note("beat count, grand, the real Attack/Defence/Speed stages, the rally extension on hits and how much the window takes back are design facts read here; the private assembly has no reader for native stat stages", {
                casts: stage.casts("victorydance", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "victory dance is cast within 60 s");
});
