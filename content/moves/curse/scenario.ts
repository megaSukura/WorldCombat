// 诅咒的可执行设计说明：这招按使用者是不是幽灵分成两种形态，所以场面同时放一个幽灵和一个非幽灵施法者。
// 必然事实：两个施法者都提交过诅咒；幽灵的对手身上出现过共享身份 world_combat:status/curse，
//   并且被绑定效果扣掉过血；非幽灵施法者身上出现过契约印记 world_combat:curse_pact。
// 幽灵押掉的确切生命、债收了几口、交换等级的具体数值都写进 note。
Smoke.scenario("curse", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var ghost = stage.pokemon({ species: "gastly", level: 36, moves: ["curse"], at: [-4, 0, -3] });
    var plain = stage.pokemon({ species: "meowth", level: 30, moves: ["curse"], at: [-4, 0, 3] });
    var foeGhost = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [4, 0, -3] });
    var foePlain = stage.pokemon({ species: "rattata", level: 18, moves: [], at: [4, 0, 3] });
    stage.hostile(ghost, foeGhost);
    stage.hostile(plain, foePlain);

    stage.until(1100, function () {
        return stage.casts("curse", ghost) > 0 && stage.casts("curse", plain) > 0
            && stage.hadMobEffect(foeGhost, "world_combat:status/curse") && stage.damageTo(foeGhost) > 0
            && stage.hadMobEffect(plain, "world_combat:curse_pact");
    }, function () {
        stage.expect(stage.casts("curse", ghost) > 0, "the Ghost cursed its foe");
        stage.expect(stage.casts("curse", plain) > 0, "the non-Ghost cursed in its own way");
        stage.expect(stage.hadMobEffect(foeGhost, "world_combat:status/curse"), "the Ghost's foe carried the shared curse identity");
        stage.expect(stage.damageTo(foeGhost) > 0, "the bound debt took health from the foe");
        stage.expect(stage.hadMobEffect(plain, "world_combat:curse_pact"), "the non-Ghost carried the pact mark");
        stage.note("幽灵形态押掉最大生命的一个比例（血契 50%%／稳咒 35%%）并把逐段扣血的债挂在对手身上；非幽灵形态押敏捷换物攻/防御/速度的等级交换。每口债份额、债的时长、间隔与交换等级分别随特攻、等级、速度变化；具体数值由完整装配的人工试玩核对。", {
            ghostCasts: stage.casts("curse", ghost), plainCasts: stage.casts("curse", plain),
            ghostDamageTaken: Math.round(stage.damageTo(ghost) * 10) / 10,
            foeDamage: Math.round(stage.damageTo(foeGhost) * 10) / 10,
            pactEver: stage.hadMobEffect(plain, "world_combat:curse_pact"), tick: stage.tick()
        });
        stage.done();
    }, "both curse branches resolved");
});
