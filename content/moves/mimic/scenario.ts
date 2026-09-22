/**
 * 模仿的可执行设计说明。
 *
 * 场面：一只只会模仿的腕力对 4 格外、只会怨恨的鬼斯开战。鬼斯先出手把「怨恨」记成它的「最后使用的招式」，
 * 腕力的模仿因此有了可借的一手；腕力只带模仿，所以模仿是它唯一能选的招。
 * 必然事实：模仿被提交过；模仿之后，施法者自己把借来的怨恨放了出来——这证明那一手真的织进了它的招式格。
 * 随机结果：念线读取的时机、实际维持时长写进 note 供读轨迹判断。
 * 之所以用同组的怨恨当对手的招，是因为这一趟私有装配里只装载本组的四招（原生迅星/电击波不在场）。
 */
Smoke.scenario("mimic", function (stage) {
    var caster = stage.pokemon({ species: "Machop", level: 32, moves: ["mimic"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Gastly", level: 30, moves: ["spite"], at: [2, 0, 0] });
    // 两只野生宝可梦互相并不被算作 hostile（只有 Monster 才是），野生大脑还会清掉原生目标；
    // 用有界的定时重申敌意，让双方始终把对方当作威胁（定时器在限时前跑完，场景能正常结束）。
    for (var step = 1; step <= 200; step++) {
        stage.after(step * 8, function () { stage.hostile(caster, target); });
    }
    stage.note("staged: machop(32) mimic vs gastly(30) spite at 4 blocks; the target acts first so its last move becomes readable, and mimic is the caster's only move");
    stage.until(1200, function () { return stage.casts("mimic", caster) >= 1; }, function () {
        stage.expect(stage.casts("mimic", caster) >= 1, "mimic was committed");
        stage.note("mimic committed; the borrowed move is woven into the mimic slot through the shared NativeModifiers moves layer", {
            casts: stage.casts("mimic", caster), targetSpiteCasts: stage.casts("spite", target),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.until(1200, function () { return stage.casts("spite", caster) >= 1; }, function () {
            stage.expect(stage.casts("spite", caster) >= 1, "the caster cast the borrowed spite as its own move");
            stage.note("the borrowed move is now the caster's slot", {
                casterSpites: stage.casts("spite", caster), targetSpites: stage.casts("spite", target)
            });
            stage.done();
        }, "caster uses the borrowed move");
    }, "mimic cast");
});
