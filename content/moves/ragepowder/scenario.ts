// 愤怒粉的可执行设计说明：这招的意义是把粉尘范围里敌人的攻击目标吸到自己身上，所以场面要有同伴与被吸的敌人。
// 必然事实：施术者提交过愤怒粉；身上出现过共享身份 world_combat:status/ragepowder。
// 「敌人被 world.target 指向施术者」「草属性免疫这团粉」是持续效果，属完整装配观察项（本单元只验证身份落地），写进 note。
Smoke.scenario("ragepowder", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 只会愤怒粉的巴大蝴；身边一名同伴让 onTry（这边不止一只）成立，敌人站在粉尘范围内。
    var caster = stage.pokemon({ species: "butterfree", level: 34, moves: ["ragepowder"], at: [-3, 0, 0] });
    var ally = stage.pokemon({ species: "caterpie", level: 20, moves: [], at: [2, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [5, 0, 0] });
    stage.team("swarm", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("ragepowder", caster) >= 1 && stage.hadMobEffect(caster, "world_combat:status/ragepowder");
    }, function () {
        stage.expect(stage.casts("ragepowder", caster) >= 1, "the butterfree committed rage powder");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/ragepowder"), "the shared ragepowder identity landed on the caster");
        stage.note("标记每 interval 刻把粉尘半径内不属于自己、非玩家、非草属性的活物用 world.target 指向施术者；草属性免疫这团粉；脚本化的伙伴 AI 仍按自己的交战逻辑行动，完整装配的人工试玩才能看到敌人真的改追施术者。半径、节奏与存续随等级、特攻、特防与 thick（浓粉／薄粉）变化。", {
            casterCasts: stage.casts("ragepowder", caster),
            identityEver: stage.hadMobEffect(caster, "world_combat:status/ragepowder"),
            allyAlive: ally.alive(), foeAlive: foe.alive(), tick: stage.tick()
        });
        stage.done();
    }, "rage powder is cast within 45 s");
});
