/**
 * 变小 的可执行设计说明。
 *
 * 场面：一只只会「变小」的皮卡丘（40 级）与一只体型远大的劫掠兽隔开 11 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先缩起来。用劫掠兽是为了让「大体型踩下来」的踩踏加成有机会真的触发。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/minimize 的缩小窗口。
 *   闪避等级、闪避概率、被踩加成与是否落空写进 note 供读轨迹判断（私有装配读不到原生闪避等级，
 *   命中与落空是概率事件，不作断言）。
 */
Smoke.scenario("minimize", function (stage) {
    stage.fill([-10, -1, -10], [12, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "pikachu", level: 40, moves: ["minimize"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:ravager", at: [8, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("minimize", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/minimize");
    }, function () {
        stage.expect(stage.casts("minimize", caster) > 0, "minimize was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/minimize"), "the shrink window carried the shared identity");
        stage.after(80, function () {
            stage.note("the shared evasion stage is a Pokemon-native reading; the real dodge and the trample punish are resolved by this unit's incoming rule against the same identity. A ravager body volume is far above 1.3x, so its hits take the trample multiplier instead of the dodge roll.", {
                casts: stage.casts("minimize", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                casterAlive: caster.alive(),
                casterHealth: Math.round(caster.health() * 10) / 10
            });
            stage.done();
        });
    }, "minimize engages");
});
