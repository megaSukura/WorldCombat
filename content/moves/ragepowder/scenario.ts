// 愤怒粉的可执行设计说明：这招的意义是把一团固定粉尘撒在原地，自己在附近经营；场面要有同伴与可能踩进云里的敌人。
// 必然事实：施术者提交过愤怒粉；身上出现过共享身份 world_combat:status/ragepowder（云在存续期内的施术者标记）。
// 「谁在什么时候入云、是否接受转向请求、草属性是否免疫」是原生 world.target 与粉末免疫的持续结果，属完整装配观察项，
//   本单元只验证提交与身份落地，写进 note。
Smoke.scenario("ragepowder", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 只会愤怒粉的巴大蝴；身边一名同伴让 onTry（这边不止一只）成立，敌人站在撒粉距离内。
    var caster = stage.pokemon({ species: "butterfree", level: 34, moves: ["ragepowder"], at: [-3, 0, 0] });
    var ally = stage.pokemon({ species: "caterpie", level: 20, moves: [], at: [2, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [0, 0, 0] });
    stage.team("swarm", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("ragepowder", caster) >= 1 && stage.hadMobEffect(caster, "world_combat:status/ragepowder");
    }, function () {
        stage.expect(stage.casts("ragepowder", caster) >= 1, "the butterfree committed rage powder");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/ragepowder"), "the shared ragepowder identity landed on the caster");
        stage.note("粉尘云固定落在施法者选定的近地（AI 施放时落在自身朝威胁方向一小段），存续期内不随施法者移动，施法者可走开。云每 interval 刻扫一遍：对刚走进来、可受粉末、且不在再次入云冷却里的非友方活物各发一次 world.target 转向请求，被接受就放一条从入云者连向施术者的短线；拒绝转向的 Boss 只是不触发，不绕粉末免疫。草属性直接穿过这团粉。半径、存续、再次入云冷却随等级、特攻、特防与 thick（浓粉／薄粉）变化，完整装配的人工试玩才能看到敌人真的改追施术者。", {
            casterCasts: stage.casts("ragepowder", caster),
            identityEver: stage.hadMobEffect(caster, "world_combat:status/ragepowder"),
            allyAlive: ally.alive(), foeAlive: foe.alive(), tick: stage.tick()
        });
        stage.done();
    }, "rage powder is cast within 45 s");
});
