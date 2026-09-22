// 看我嘛的可执行设计说明：这招的意义是把身边敌人的攻击目标拉到自己身上，所以场面要有同伴与被引的敌人。
// 必然事实：施术者提交过看我嘛；身上出现过共享身份 world_combat:status/followme。
// 「敌人被 world.target 指向施术者」是持续效果，属完整装配观察项（本单元只验证身份落地），写进 note。
Smoke.scenario("followme", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 只会看我嘛的皮皮；身边一名同伴让 onTry（这边不止一只）成立，敌人站在喊话范围内。
    var caster = stage.pokemon({ species: "clefairy", level: 32, moves: ["followme"], at: [-3, 0, 0] });
    var ally = stage.pokemon({ species: "pichu", level: 24, moves: [], at: [2, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [6, 0, 0] });
    stage.team("lure", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("followme", caster) >= 1 && stage.hadMobEffect(caster, "world_combat:status/followme");
    }, function () {
        stage.expect(stage.casts("followme", caster) >= 1, "the clefairy committed follow me");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/followme"), "the shared followme identity landed on the caster");
        stage.note("标记每 interval 刻把喊话半径内不属于自己、非玩家的活物用 world.target 指向施术者；脚本化的伙伴 AI 仍按自己的交战逻辑行动，完整装配的人工试玩才能看到敌人真的改追施术者。范围与时长随等级、特攻、特防与 shout（喊话／招手）变化。", {
            casterCasts: stage.casts("followme", caster),
            identityEver: stage.hadMobEffect(caster, "world_combat:status/followme"),
            allyAlive: ally.alive(), foeAlive: foe.alive(), tick: stage.tick()
        });
        stage.done();
    }, "follow me is cast within 45 s");
});
