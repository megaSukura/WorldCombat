namespace PokemonSkills {
    actionParameters.define("powersplit", {
        reach: formula(F.base(6).plus(F.stat("specialAttack").times(.025)).plus(F.body("height").times(1.1)).clamp(4, 12).round(1),
            "连接距离", { unit: " 格", description: "起手和落定都要求目标在距离内且视线可达；连接后可各自行动。" }),
        tempo: seconds(F.base(10).minus(F.stat("attack").times(.03)).clamp(4, 14).round(0), "起手", "建立两端连接的准备时间。"),
        aftercast: seconds(F.base(6).minus(F.stat("speed").times(.02)).clamp(3, 10).round(0), "收招", "连接落定后的收势。"),
        recharge: seconds(F.base(95).minus(F.level().times(.3)).clamp(45, 140).round(0), "冷却", "再次建立连接前的等待。"),
        span: seconds(F.const(160), "连接窗口", "八秒内各一收一送；任何一端失效时成对结束，未用份额消散。")
    });
    stages("powersplit", [{ level: 40, values: { reach: 8.6 } }, { level: 55, values: { reach: 9.6 } }]);
    describe("powersplit", [
        { key: "description.0", values: ["reach", "span"] },
        { key: "description.1", values: [] },
        { key: "description.2", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach"] }
    ]);
}