// 看我嘛的可执行设计说明：这招的意义是把身边敌人的攻击目标拉到自己身上，所以场面要有同伴与被招呼的敌人。
// 必然事实：施术者提交过看我嘛；身上出现过共享身份 world_combat:status/followme。
// 「哪些敌人接受了转向请求、之后是否被持续维持」属于原生 targetLease 的持续结果，也取决于完整装配里的对象，
//   本单元只验证身份落地与提交，写进 note。
Smoke.scenario("followme", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 只会看我嘛的皮皮；身边一名同伴让 onTry（这边不止一只）成立，敌人站在喊话半径内。
    var caster = stage.pokemon({ species: "clefairy", level: 32, moves: ["followme"], at: [-4, 0, 0] });
    var ally = stage.pokemon({ species: "pichu", level: 24, moves: [], at: [3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [0, 0, 0] });
    stage.team("lure", [caster, ally]);
    stage.hostile(caster, foe);

    stage.until(900, function () {
        return stage.casts("followme", caster) >= 1 && stage.hadMobEffect(caster, "world_combat:status/followme");
    }, function () {
        stage.expect(stage.casts("followme", caster) >= 1, "the clefairy committed follow me");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/followme"), "the shared followme identity landed on the caster");
        stage.note("第一声对喊话半径内非友方、非玩家的活物各申请一次有限重定向租约（world.targetLease）；原生接受者纳入响应表，之后每 interval 刻只维护仍由本效果持有、且还在半径内的响应者，离开半径或换阵营就交还租约且本次不抢回，被外部真实请求接管的只清自己的账本与连线。身份标记按本次 carrier 的 revision 归属：刷新成新 carrier 时旧标记不再清除新状态。脚本化的伙伴 AI 仍按自己的交战逻辑行动，完整装配的人工试玩才能看到哪些敌人真的改追施术者、以及短连线是否只连向实际响应者。范围与时长随等级、特攻、特防与 shout（喊话／招手）变化。", {
            casterCasts: stage.casts("followme", caster),
            identityEver: stage.hadMobEffect(caster, "world_combat:status/followme"),
            allyAlive: ally.alive(), foeAlive: foe.alive(), tick: stage.tick()
        });
        stage.done();
    }, "follow me is cast within 45 s");
});
