/**
 * 宇宙力量 的可执行设计说明。
 *
 * 场面：一只只会「宇宙力量」的海星星（24 级）与一只被点住、不会移动的小拉达隔开 10 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先站定汲取星光。有威胁且在汲力距离内、还没贴身时，它会先摆好防护。
 * 必然事实：白天基础各 1 级真的写进公共能力阶梯；用 PP 归零阻止重施后，窗口走完会把这两项等级按来源收回。
 *   随后把时间切到夜里（日光低于四分之一）再施放一次，同一招两项各多 1 级。第二层星环只属表现，写进 note 不作断言。
 */
Smoke.scenario("cosmicpower", function (stage) {
    stage.fill([-9, -1, -9], [9, -1, 9], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "staryu", level: 24, moves: ["cosmicpower"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(1200, function () {
        return stage.casts("cosmicpower", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/cosmicpower");
    }, function () {
        stage.expect(stage.casts("cosmicpower", caster) > 0, "cosmic power was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/cosmicpower"), "the starlight window carried the shared identity");
        var day = stage.stages(caster);
        stage.expect(day.def >= 1 && day.spd >= 1, "daylight starlight raised Defense and Sp. Def");
        // 阻止再次汲取，让这一条窗口自己走完，验证来源回收而不是靠重施覆盖。
        stage.setPp(caster, "cosmicpower", 0);
        stage.until(700, function () {
            return !stage.hasMobEffect(caster, "world_combat:status/cosmicpower");
        }, function () {
            var gone = stage.stages(caster);
            stage.expect((gone.def || 0) === 0 && (gone.spd || 0) === 0, "the window reclaimed both stages from its own source when it ended");
            // 夜里日光低于四分之一：同一招两项各多 1 级。
            stage.time("night");
            stage.setPp(caster, "cosmicpower", 20);
            stage.until(1200, function () {
                return stage.casts("cosmicpower", caster) >= 2
                    && stage.hasMobEffect(caster, "world_combat:status/cosmicpower");
            }, function () {
                var night = stage.stages(caster);
                stage.expect(night.def >= 2 && night.spd >= 2, "below a quarter sunlight each stage rose by one more");
                stage.note("Daylight gives 1 stage each; below a quarter sunlight the same move gives 2 each. The window is carrier-owned: refresh replaces it and expiry/dispel takes back only its own contribution. The extra second stardust ring at low light is presentation only.", {
                    day: day,
                    afterDay: gone,
                    night: night,
                    casts: stage.casts("cosmicpower", caster),
                    damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                    damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                    casterAlive: caster.alive()
                });
                stage.done();
            }, "the low-light starlight engages");
        }, "the daylight starlight window ends");
    }, "cosmic power engages");
});
