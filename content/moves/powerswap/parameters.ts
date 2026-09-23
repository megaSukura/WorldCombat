/**
 * 力量互换 / powerswap —— 参数与数值来源。
 *
 * 原生事实（Showdown / Cobblemon 1.8）：Psychic／变化／威力 0／命中必中／PP 10／目标 normal；
 *   `onHit` 把双方攻击与特攻的**能力变化等级**互换（storedStats 的原始数值不动）。
 *
 * 核心念头：把两个人身上已经攒起来的攻势对调——对方涨到 +2 的攻/特攻被你接走，你原来那几级原封不动地落到他身上；
 *   交换在一段窗口里维持，窗口走完或被清除时各自按记号换回原来的等级。
 *
 * 为什么换的是等级而不是原始数值：原生换 `stages`，世界化后「攻势」的可观察量就是攻/特攻的能力等级；
 *   等级阶梯对宝可梦、原版生物、玩家是同一条路（宝可梦原生阶梯，其他生物走 CombatStages），
 *   换完真的会改变伤害与出手表现，也能精确换回。与「力量平分」分开：平分把两人的原始攻/特攻拉向同一个平均值，
 *   本招只交换**已经攒起来的那部分**，不碰底子。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   reach     换势距离：特攻给出能对上的范围，身高决定臂展，夹 4..12，并作为本招实际射程。
 *   tempo     起手：速度决定读出双方攻势多快。
 *   aftercast 收招：速度决定换完多久收回。
 *   recharge  冷却：速度决定多久能再换一次。
 *   span      交换窗口：等级与攻击决定这次交换维持多久（攻势越高的人越撑得住）。
 *   threads   对流条数：特攻决定画面里两人之间对流的光丝数量；身高再补几股。
 */
namespace PokemonSkills {
    actionParameters.define("powerswap", {
        reach: formula(
            F.base(6, "基础")
                .plus(F.stat("specialAttack").times(0.025).as("特攻"))
                .plus(F.body("height").times(1.1).as("体型"))
                .clamp(4, 12).round(1),
            "换势距离", {
                unit: " 格",
                description: "能对上多远之外那人的攻势；特攻越高、身板越大够得越远。它也是本招实际射程的来源。"
            }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").times(0.035).as("速度")).clamp(4, 13).round(0),
            "起手", "读出并交换双方攻势需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(6, "基础").minus(F.stat("speed").times(0.02).as("速度")).clamp(3, 10).round(0),
            "收招", "交换完成后的收势；速度快的个体收得更利落。"),
        recharge: seconds(
            F.base(70, "基础").minus(F.stat("speed").times(0.25).as("速度")).clamp(32, 110).round(0),
            "冷却", "两次换势之间的等待；速度快的个体恢复快。"),
        span: seconds(
            F.base(220, "基础").plus(F.level().times(2.4).as("等级")).plus(F.stat("attack").times(0.5).as("攻击"))
                .clamp(140, 600).round(0),
            "交换窗口", "换来的攻势维持多久；等级与攻击越高越久，窗口走完自动换回原来的等级。"),
        threads: formula(
            F.base(6, "基础").plus(F.stat("specialAttack").div(60).as("特攻")).plus(F.body("height").times(0.8).as("体型"))
                .clamp(6, 18).round(0),
            "对流条数", {
                unit: " 条",
                description: "两人之间对流的光丝数量；特攻越高、身板越大越密，画面按它发射。"
            })
    });

    stages("powerswap", [
        { level: 40, values: { reach: 8.8, span: 340 } },
        { level: 55, values: { reach: 9.8, span: 420 } }
    ]);

    describe("powerswap", [
        { key: "description.0", values: ["reach", "span"] },
        { key: "description.1", values: [] },
        { key: "description.2", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.span"] }
    ]);
}
