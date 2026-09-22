/**
 * 定身法的可执行设计说明。
 *
 * 场面：一只只会定身法的腕力对 4 格外、只会封印的凯西；腕力身边还带着一只只会封印的小拉达（同队）。
 *   凯西与小拉达招式重合，于是它会先立起封印，让自己的「最后使用的招式」有内容；腕力随后点名封住那一手。
 *   （用同组招式做陪练，是因为这一趟私有装配里只装载本组的四招。）
 * 必然事实：定身法被提交过；目标身上出现过共享身份 world_combat:status/disable 的定身钉。
 *   被点名的那一手之后被顶回几次，写进 note 供读轨迹判断（命中与时机由 AI 走位决定）。
 */
Smoke.scenario("disable", function (stage) {
    var target = stage.pokemon({ species: "Kadabra", level: 34, moves: ["imprison"], at: [2, 0, 0] });
    var caster = stage.pokemon({ species: "Machop", level: 34, moves: ["disable"], at: [-2, 0, 0] });
    // 同队的陪练给凯西一个重合招式，凯西才会先出手；它不参战，只看住自己的招式表。
    var partner = stage.pokemon({ species: "Rattata", level: 20, moves: ["imprison"], at: [2, 0, 2] });
    stage.team("pack", [caster, partner]);
    // 两只野生宝可梦互相并不被算作 hostile（只有 Monster 才是），野生大脑还会清掉原生目标；
    // 用有界的定时重申敌意，让它们始终把对方当作威胁（定时器在限时前跑完，场景能正常结束）。
    for (var step = 1; step <= 100; step++) {
        stage.after(step * 8, function () { stage.hostile(caster, target); });
    }
    stage.note("staged: machop(34) disable vs kadabra(34) imprison; a teamed rattata shares imprison so the target acts first and its last move stays readable");
    stage.until(1200, function () {
        return stage.casts("disable", caster) > 0;
    }, function () {
        // 落钉与效果登记跨一个 tick，等一小会儿再核对。
        stage.after(50, function () {
            stage.expect(stage.casts("disable", caster) > 0, "disable was committed");
            stage.expect(stage.hadMobEffect(target, "world_combat:status/disable"), "the target carried the shared disable identity");
            stage.note("定身法点名封住目标刚用过的那一手；期间提交同名招式会被共享动作策略顶回，但目标换另一手照样能打。封哪一手取决于目标实际最后使用的招式（随机/时机），时长与射程随等级、特攻、体型与配置变化。", {
                disableCasts: stage.casts("disable", caster), targetImprisonCasts: stage.casts("imprison", target),
                identitySeen: stage.hadMobEffect(target, "world_combat:status/disable"),
                casterHealth: caster.health(), tick: stage.tick()
            });
            stage.done();
        });
    }, "disable was cast");
});
