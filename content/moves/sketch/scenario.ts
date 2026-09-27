/**
 * 写生的可执行设计说明。
 *
 * 场面：一只只会写生的图图犬对 4 格外、只会龙箭的土台龟开战。土台龟先出手把「龙箭」记成它的「最后使用的招式」，
 * 写生因此有可描的一手；图图犬只带写生，落笔后那一格永久换成龙箭，它便把那手打出来。
 * 必然事实：写生被提交过；描摹之后，施法者自己把描来的龙箭放了出来——这证明那一手真的被永久写进了原生招式表。
 * 默认 AI 不自主永久改槽，这里用 prefer 明确开启「允许自主永久学习」来驱动伙伴落笔；玩家亲自描摹不受此限。
 * 之所以拿同组的龙箭当示范招，是因为这一趟私有装配里只装载本组的四招（原生迅星／电击波等不在场）。
 * 随机结果：落笔时机、学会后施法者的使用频率写进 note 供读轨迹判断。
 * 写生是真实原生招式表写入（通用槽 CAS），不是临时招层；smoke 通过施法者自己会打出来验证这条链。
 */
Smoke.scenario("sketch", function (stage) {
    var caster = stage.pokemon({ species: "Smeargle", level: 60, moves: ["sketch"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Torterra", level: 20, moves: ["dragondarts"], at: [2, 0, 0] });
    // 默认 AI 不自主永久改槽，这里在首批 tick 后明确开启「允许自主永久学习」来驱动伙伴落笔。
    stage.after(2, function () { stage.prefer(caster, "sketch", { ai: { permanent: true } }); });
    stage.hostile(caster, target);
    // 两只野生宝可梦互相并不被算作 hostile（只有 Monster 才是），野生大脑还会清掉原生目标；
    // 用有界的定时重申敌意，让双方始终把对方当作威胁（定时器在限时前跑完，场景能正常结束）。
    for (var step = 1; step <= 300; step++) {
        stage.after(step * 8, function () { stage.hostile(caster, target); });
    }
    stage.note("staged: smeargle(60) sketch vs torterra(20) dragondarts at 4 blocks; autonomous permanent learning is enabled on the caster, the target acts first so its last move becomes sketchable, and sketch is the caster's only move");
    stage.until(1600, function () { return stage.casts("sketch", caster) >= 1; }, function () {
        stage.expect(stage.casts("sketch", caster) >= 1, "sketch was committed");
        stage.note("sketch committed; the locked move is written into the native move set through the generic slot CAS", {
            casts: stage.casts("sketch", caster), targetDartsCasts: stage.casts("dragondarts", target),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.until(1600, function () { return stage.casts("dragondarts", caster) >= 1; }, function () {
            stage.expect(stage.casts("dragondarts", caster) >= 1, "the caster cast the sketched move as its own");
            stage.note("the sketched move is permanently in the caster's native move set", {
                casterDarts: stage.casts("dragondarts", caster), targetDarts: stage.casts("dragondarts", target)
            });
            stage.done();
        }, "caster uses the sketched move");
    }, "sketch cast");
});
