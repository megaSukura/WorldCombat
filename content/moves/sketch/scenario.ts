/**
 * 写生的可执行设计说明。
 *
 * 场面：一只只会写生的图图犬对 4 格外、只会怨恨的鬼斯开战。鬼斯先出手把「怨恨」记成它的「最后使用的招式」，
 * 写生因此有可描的一手；图图犬只带写生，落笔后那一格永久换成对手的招，它便把那手打出来。
 * 必然事实：写生被提交过；描摹之后，施法者自己把描来的怨恨放了出来——这证明那一手真的被永久写进了原生招式表。
 * 随机结果：落笔时机、学会后施法者的使用频率写进 note 供读轨迹判断。
 * 写生是真实原生招式表写入（MoveSet.setMove），不是临时招层；smoke 通过施法者自己会打出来验证这条链。
 * 之所以用同组的怨恨当对手的招，是因为这一趟私有装配里只装载本组的四招（原生迅星/电击波不在场）。
 */
Smoke.scenario("sketch", function (stage) {
    var caster = stage.pokemon({ species: "Smeargle", level: 32, moves: ["sketch"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Gastly", level: 30, moves: ["spite"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    // 两只野生宝可梦互相并不被算作 hostile（只有 Monster 才是），野生大脑还会清掉原生目标；
    // 用有界的定时重申敌意，让双方始终把对方当作威胁（定时器在限时前跑完，场景能正常结束）。
    for (var step = 1; step <= 200; step++) {
        stage.after(step * 8, function () { stage.hostile(caster, target); });
    }
    stage.note("staged: smeargle(32) sketch vs gastly(30) spite at 4 blocks; the target acts first so its last move becomes sketchable, and sketch is the caster's only move");
    stage.until(1200, function () { return stage.casts("sketch", caster) >= 1; }, function () {
        stage.expect(stage.casts("sketch", caster) >= 1, "sketch was committed");
        stage.note("sketch committed; the last move is written into the native move set through the raw native object", {
            casts: stage.casts("sketch", caster), targetSpiteCasts: stage.casts("spite", target),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.until(1200, function () { return stage.casts("spite", caster) >= 1; }, function () {
            stage.expect(stage.casts("spite", caster) >= 1, "the caster cast the sketched move as its own");
            stage.note("the sketched move is permanently in the caster's native move set", {
                casterSpites: stage.casts("spite", caster), targetSpites: stage.casts("spite", target)
            });
            stage.done();
        }, "caster uses the sketched move");
    }, "sketch cast");
});
