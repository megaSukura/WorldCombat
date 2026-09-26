/**
 * 宇宙力量 的可执行设计说明。
 *
 * 场面：一只只会「宇宙力量」的海星星（24 级）与一只弱小的小拉达隔开 10 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先站定汲取星光。有威胁且在汲力距离内、还没贴身时，它会先摆好防护。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/cosmicpower 的星辉窗口；
 *   白天基础 1 级的两项等级真的写进了公共能力阶梯；把 PP 设零阻止重施后，窗口结束会把这两项等级按来源收回。
 *   夜里多 1 级与第二层星座属于表现，放在 note 里说明，不作断言。
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
        var raised = stage.stages(caster);
        stage.expect(raised.def >= 1 && raised.spd >= 1, "the owned window raised Defense and Sp. Def");
        // 阻止再次汲取，让这一条窗口自己走完，验证来源回收而不是靠重施覆盖。
        stage.setPp(caster, "cosmicpower", 0);
        stage.until(700, function () {
            return !stage.hasMobEffect(caster, "world_combat:cosmic_surge");
        }, function () {
            var gone = stage.stages(caster);
            stage.expect((gone.def || 0) === 0 && (gone.spd || 0) === 0, "the window reclaimed both stages from its own source when it ended");
            stage.note("Defense/Sp. Def are 1 each in daylight; at night (sunlight below a quarter) the second constellation layer lights for the extra stage. The window is carrier-owned: refresh replaces it and expiry/dispel takes back only its own contribution.", {
                casts: stage.casts("cosmicpower", caster),
                raised: raised,
                after: gone,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                casterAlive: caster.alive()
            });
            stage.done();
        }, "the starlight window ends");
    }, "cosmic power engages");
});
