/**
 * 冥想 的可执行设计说明。
 *
 * 场面：一只只会「冥想」的凯西（24 级）与一只弱小的小拉达隔开 9 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先静一息。有威胁且在静心距离内、还没贴身时，它会先收心再考虑交战。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/calmmind 的清明窗口。
 *   特攻与特防各抬了几级、清明撑多久、窗口结束时收回多少写进 note 供读轨迹判断（私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("calmmind", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "abra", level: 24, moves: ["calmmind"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("calmmind", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/calmmind");
    }, function () {
        stage.expect(stage.casts("calmmind", caster) > 0, "calm mind was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/calmmind"), "the clarity window carried the shared identity");
        stage.after(80, function () {
            stage.note("the deep choice sets Sp. Atk/Sp. Def stages (+2/+2 deep, +1/+1 shallow); both are native for a Pokemon and unreadable here, and the window takes them back by its stored mark when it ends.", {
                casts: stage.casts("calmmind", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "calm mind engages");
});
