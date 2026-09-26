/** Current stat-stage differences form an owned temporary exchange; later independent changes remain. */
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
