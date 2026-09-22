/**
 * 速度互换 / speedswap —— 参数与数值来源。
 *
 * 原生事实（Showdown / Cobblemon 1.8）：Psychic／变化／威力 0／命中必中／PP 10／目标 normal；
 *   `onHit` 把双方的 `storedStats.spe`（不含能力等级的原始速度）互换。
 *
 * 核心念头：把两个人的速度在一条线上对调——你快我慢的次序，从碰到的一刻起倒过来。
 *
 * 翻译：原生换的是「原始速度数值」，而在这个世界里真正决定你跑多快、出手多快的是速度的能力阶梯与基础速度
 *   乘出来的**有效速度**。所以本招换的是**有效速度**：读出双方各自的速度读数（宝可梦读原生速度与速度等级，
 *   其他生物读移动速度与公共速度等级，同一套刻度），再各自把速度等级调到「拿到对方那一档」的位置；
 *   换完在窗口里维持，窗口走完或被清除时按记号换回原来的等级。原生换数值、世界化后落到等级阶梯——
 *   等级阶梯对宝可梦、原版生物、玩家是同一条路，换完的移动速度与出手节奏真的会变。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   reach     换速距离：特攻给出能对上的范围，身高决定臂展，夹 4..12，并作为本招实际射程。
 *   tempo     起手：速度决定读出双方速度多快。
 *   aftercast 收招：速度决定换完多久收回。
 *   recharge  冷却：速度决定多久能再换一次；拉平比互换便宜。
 *   span      交换窗口：等级与特防决定这次的交换维持多久。
 *   threads   对流条数：特攻决定画面里在两人之间对流的光丝数量。
 * 配置 mode（互换／拉平）双向取舍：互换把两人的有效速度对调——对方比你快你赚满，比你慢你就亏满，风险对等；
 *   拉平让双方都朝中间靠（把差距压一半），稳定、可预期，但对方更慢时反而拖累自己。两种各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("speedswap", {
        reach: formula(
            F.base(6, "基础")
                .plus(F.stat("specialAttack").times(0.025).as("特攻"))
                .plus(F.body("height").times(1.1).as("体型"))
                .clamp(4, 12).round(1),
            "换速距离", {
                unit: " 格",
                description: "能对上多远之外那人的速度；特攻越高、身板越大够得越远。它也是本招实际射程的来源。"
            }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").times(0.035).as("速度")).clamp(4, 13).round(0),
            "起手", "读出并交换双方速度需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(6, "基础").minus(F.stat("speed").times(0.02).as("速度")).clamp(3, 10).round(0),
            "收招", "交换完成后的收势；速度快的个体收得更利落。"),
        recharge: seconds(
            F.base(75, "基础").minus(F.stat("speed").times(0.28).as("速度"))
                .times(F.when(F.pref("mode"), F.const(1.15), F.const(0.85)).as("交换方式"))
                .clamp(35, 120).round(0),
            "冷却", "两次换速之间的等待；速度快的个体恢复快，互换比拉平贵。"),
        span: seconds(
            F.base(200, "基础").plus(F.level().times(2.4).as("等级")).plus(F.stat("specialDefence").times(0.7).as("特防"))
                .times(F.when(F.pref("mode"), F.const(1.15), F.const(0.75)).as("交换方式"))
                .clamp(120, 600).round(0),
            "交换窗口", "换来速度维持多久；等级与特防越高越久，互换比拉平多撑一会儿。窗口走完自动换回原来的等级。"),
        threads: formula(
            F.base(6, "基础").plus(F.stat("specialAttack").div(55).as("特攻")).clamp(6, 18).round(0),
            "对流条数", {
                unit: " 条",
                description: "两人之间对流的光丝数量；特攻越高越密，画面按它发射。"
            })
    });

    stages("speedswap", [{ level: 40, values: { reach: 8.8, span: 320 } }, { level: 55, values: { reach: 9.8, span: 380 } }]);

    describe("speedswap", [
        { key: "description.0", values: ["reach", "span"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "mode.exchange", values: [], when: function (context) { return read(context.detail.values, ["mode"]) === 1; } },
        { key: "mode.dampen", values: [], when: function (context) { return read(context.detail.values, ["mode"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.span"] }
    ]);
}
