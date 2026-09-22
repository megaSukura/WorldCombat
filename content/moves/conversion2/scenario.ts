/**
 * 纹理２的可执行设计说明。
 *
 * 场面：一只只会纹理２的多边兽２对 4 格外、只会怨恨的鬼斯开战。鬼斯先出手，它的「最后使用的招式」是
 * 幽灵属性的怨恨，纹理２便读得到属性、能把身体重织成抗幽灵的那一种（多边兽２是普通属性，会挑恶）。
 * 必然事实：纹理２被提交过（预检要求目标已有最后招式，所以它一定是在鬼斯出手之后才放的）。
 * 随机结果：换成哪一种抗性属性、目标下一次出手的时机写进 note 供读轨迹判断。
 * 属性重织走共享的 NativeModifiers types 层，不是 MobEffect，smoke 无法直接读；改动记在 note 里。
 * 之所以用同组的怨恨当对手的招，是因为这一趟私有装配里只装载本组的四招（原生迅星/电击波不在场）。
 */
Smoke.scenario("conversion2", function (stage) {
    var caster = stage.pokemon({ species: "Porygon2", level: 40, moves: ["conversion2"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "Gastly", level: 30, moves: ["spite"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    // 两只野生宝可梦互相并不被算作 hostile（只有 Monster 才是），野生大脑还会清掉原生目标；
    // 用有界的定时重申敌意，让双方始终把对方当作威胁（定时器在限时前跑完，场景能正常结束）。
    for (var step = 1; step <= 200; step++) {
        stage.after(step * 8, function () { stage.hostile(caster, target); });
    }
    stage.note("staged: porygon2(40) conversion2 vs gastly(30) spite(ghost) at 4 blocks; the target acts first so its last move carries a readable type");
    stage.until(1200, function () { return stage.casts("conversion2", caster) >= 1; }, function () {
        stage.expect(stage.casts("conversion2", caster) >= 1, "conversion2 was committed");
        stage.note("conversion2 committed; the type layer is applied through the shared NativeModifiers types layer (expected: dark, resisting ghost)", {
            casts: stage.casts("conversion2", caster), targetSpiteCasts: stage.casts("spite", target),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.done();
    }, "conversion2 cast");
});
