// 焕然一新的可执行设计说明：这招只在身上带着毒／灼／麻时才成立，所以场面先让施术者挂上灼伤。
// 必然事实：施术者提交过焕然一新；灼伤身份消失（被真正清除）；并出现清爽窗口身份 world_combat:status/clearheaded。
// 睡眠与冰冻不被清除、清爽窗口的时长与弹开由完整装配观察，写进 note。
Smoke.scenario("refresh", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 只会焕然一新的小火马，带灼伤登场；技能表只给这一招，AI 不会分心去打人。
    var caster = stage.pokemon({ species: "ponyta", level: 34, moves: ["refresh"], at: [-3, 0, 0], status: "burn" });
    var foe = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);

    stage.until(900, function () {
        // mob_effect_added 在效果加上后的下一个 tick 才记录，所以把「清爽窗口已被记录」一起写进条件。
        return stage.casts("refresh", caster) >= 1 && !stage.hasMobEffect(caster, "world_combat:status/burn")
            && stage.hadMobEffect(caster, "world_combat:status/clearheaded");
    }, function () {
        stage.expect(stage.casts("refresh", caster) >= 1, "the afflicted ponyta committed refresh");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/burn"), "the caster had carried the burn identity before cleansing");
        stage.expect(!stage.hasMobEffect(caster, "world_combat:status/burn"), "refresh cleared the burn identity");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/clearheaded"), "the clear window identity was applied");
        stage.note("睡眠与冰冻不在本招的清除范围（忠实原生 onHit）；清爽窗口的时长由特防与等级决定，窗口内毒／灼／麻会被 CombatStatus.gate 弹开；清掉的是原生灼伤且共享镜像同步。", {
            casterCasts: stage.casts("refresh", caster),
            burnEver: stage.hadMobEffect(caster, "world_combat:status/burn"),
            burnNow: stage.hasMobEffect(caster, "world_combat:status/burn"),
            clearEver: stage.hadMobEffect(caster, "world_combat:status/clearheaded"),
            casterHealth: Math.round(caster.health() * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "refresh cures the caster within 45 s");
});
