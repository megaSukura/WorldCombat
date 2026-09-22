/**
 * 宇宙力量 的可执行设计说明。
 *
 * 场面：一只只会「宇宙力量」的海星星（24 级）与一只弱小的小拉达隔开 10 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先站定汲取星光。有威胁且在汲力距离内、还没贴身时，它会先摆好防护。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/cosmicpower 的星辉窗口。
 *   防御与特防各抬了几级（白天基础 1 级、夜里多 1 级）、星辉撑多久写进 note 供读轨迹判断（私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("cosmicpower", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "staryu", level: 24, moves: ["cosmicpower"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("cosmicpower", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/cosmicpower");
    }, function () {
        stage.expect(stage.casts("cosmicpower", caster) > 0, "cosmic power was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/cosmicpower"), "the starlight window carried the shared identity");
        stage.after(80, function () {
            stage.note("Defense/Sp. Def stages are 1 each in daylight and 2 each at night (sunlight below a quarter); both are native for a Pokemon and unreadable here. The window takes them back by its stored mark when it ends.", {
                casts: stage.casts("cosmicpower", caster),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "cosmic power engages");
});
