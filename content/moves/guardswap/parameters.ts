/**
 * 防守互换 / guardswap —— 参数与数值来源。
 *
 * 原生事实（Showdown / Cobblemon 1.8）：Psychic／变化／威力 0／命中必中／PP 10／目标 normal；
 *   `onHit` 把双方防御与特防的**能力变化等级**互换。
 *
 * 核心念头：把两个人身上已经架起来的守势对调——对方涨到 +2 的防/特防被你接走，你原来那几级原封不动地落到他身上；
 *   交换在一段窗口里维持，窗口走完或被清除时各自按记号换回原来的等级。
 *
 * 与「防守平分」分开：平分把两人原始防/特防拉向同一个平均值、不碰等级；本招交换的是已经架起来的那几级。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   reach     换守距离：特防给出能对上的范围，身高决定臂展，夹 4..12，并作为本招实际射程。
 *   tempo     起手：速度决定读出双方守势多快。
 *   aftercast 收招：速度决定换完多久收回。
 *   recharge  冷却：速度决定多久能再换一次。
 *   span      交换窗口：等级与防御决定这次交换维持多久（守得越厚的人越撑得住）。
 *   threads   对流条数：防御与身高决定画面里两弧之间的光点数量。
 */
namespace PokemonSkills {
    actionParameters.define("guardswap", {
        reach: formula(
            F.base(6, "基础")
                .plus(F.stat("specialDefence").times(0.025).as("特防"))
                .plus(F.body("height").times(1.1).as("体型"))
                .clamp(4, 12).round(1),
            "换守距离", {
                unit: " 格",
                description: "能对上多远之外那人的守势；特防越高、身板越大够得越远。它也是本招实际射程的来源。"
            }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").times(0.035).as("速度")).clamp(4, 13).round(0),
            "起手", "读出并交换双方守势需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(6, "基础").minus(F.stat("speed").times(0.02).as("速度")).clamp(3, 10).round(0),
            "收招", "交换完成后的收势；速度快的个体收得更利落。"),
        recharge: seconds(
            F.base(70, "基础").minus(F.stat("speed").times(0.25).as("速度")).clamp(32, 110).round(0),
            "冷却", "两次换守之间的等待；速度快的个体恢复快。"),
        span: seconds(
            F.base(220, "基础").plus(F.level().times(2.4).as("等级")).plus(F.stat("defence").times(0.5).as("防御"))
                .clamp(140, 600).round(0),
            "交换窗口", "换来的守势维持多久；等级与防御越高越久，窗口走完自动换回原来的等级。"),
        threads: formula(
            F.base(6, "基础").plus(F.stat("defence").div(45).as("防御")).plus(F.body("height").times(0.8).as("体型"))
                .clamp(6, 18).round(0),
            "对流条数", {
                unit: " 条",
                description: "两人之间对流的光点数量；防御越高、身板越大越密，画面按它发射。"
            })
    });

    stages("guardswap", [
        { level: 40, values: { reach: 8.8, span: 340 } },
        { level: 55, values: { reach: 9.8, span: 420 } }
    ]);

    describe("guardswap", [
        { key: "description.0", values: ["reach", "span"] },
        { key: "description.2", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.span"] }
    ]);
}
