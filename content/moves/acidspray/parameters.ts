/**
 * 酸液炸弹 / acidspray —— 参数与伤害段。
 *
 * 原生事实：Poison／特殊／威力 40／命中 100／PP 20／target normal／追加 100% 令目标特防 −2。
 *
 * 翻译：把「喷出能溶化对手的液体」落成一道**不脱手、覆盖身前一整块楔形的即时酸雾**——酸雾从口边喷出、
 * 扑在身前短短一截里，楔形内每个敌人各挨一口并把特防溶掉两级；雾在空气里停留片刻，期间走进来的人
 * 也会被淋到，但每人只算一次。它是四式里唯一没有飞行物、范围最短、PP 最多、掉防最狠的一招：
 * 便宜、密、贴脸，适合反复磨。原生「大幅降低特防」直接落成固定 −2 级。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   core          喷淋威力：特攻定腐蚀强度，等级定酸液浓度。
 *   drift         残雾威力：特攻定残留酸雾的腐蚀性。
 *   sprayRange    射程：特攻与体型高度决定雾能兜到多远。
 *   sprayAngle    楔角：特攻决定雾铺多开，等级补一点控制力；聚焦喷口收窄。
 *   cloudTicks    残雾时长：等级与特攻决定酸雾在空气里留多久。
 *   droplets      酸滴数：特攻与等级派生，也驱动表现密度。
 *   sunderStages  碾防级数：固定 2 级，与原生一致。
 *   tempo         起手：速度决定鼓酸出手的快慢。
 *
 * 配置 `focus`（聚焦喷口）双向取舍：开启＝张角 ×0.55、射程 ×1.3、单发 ×1.15，但残雾时长 ×0.7、射程虽远覆盖却窄、
 * 起手 +2 刻、冷却 +5；关闭（宽喷）＝张角最宽，适合一次淋到挤在身前的一群。两向分别对应点名与清场。
 *
 * 伤害段 `core`（喷淋）与 `drift`（残雾）各自成段，走共享换算（原生类别 Special）。
 * 特防下降走共享能力等级阶梯 NativeEffects.boost(..., "spd", -2)。
 */
namespace PokemonSkills {
    actionParameters.define("acidspray", {
        /** 喷淋威力：38 + 特攻偏移[−8,26] + 等级(≥25)偏移[0,9]；聚焦 ×1.15；夹 24..86。 */
        core: formula(
            F.base(38)
                .plus(F.stat("specialAttack").minus(50).times(0.22).clamp(-8, 26))
                .plus(F.level().minus(25).times(0.35).clamp(0, 9))
                .times(F.when(F.pref("focus"), F.const(1.15), F.const(1)))
                .clamp(24, 86).round(1),
            "喷淋威力", {
                unit: "威力",
                description: "酸雾淋到每个目标时各结算一次的威力；特攻越高溶得越狠、等级越高酸越浓，聚焦喷口把力收在一点。对手特防、相性与暴击在命中时另算。"
            }),
        /** 残雾威力：10 + 特攻偏移[−3,10]；夹 6..22。 */
        drift: formula(
            F.base(10).plus(F.stat("specialAttack").minus(50).times(0.06).clamp(-3, 10)).clamp(6, 22).round(1),
            "残雾威力", {
                unit: "威力",
                description: "酸雾停留期间，走进去还没被淋过的人再挨一口的威力；特攻越高残留酸雾越咬人。"
            }),
        /** 射程：5 + 特攻偏移[−0.5,1.2] + 高度偏移[−0.2,0.8]；聚焦 ×1.3；夹 3.5..9。 */
        sprayRange: formula(
            F.base(5.0)
                .plus(F.stat("specialAttack").minus(50).times(0.012).clamp(-0.5, 1.2))
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.8))
                .times(F.when(F.pref("focus"), F.const(1.3), F.const(1)))
                .clamp(3.5, 9).round(2),
            "射程", {
                unit: "格",
                description: "酸雾能兜到身前多远；特攻高、体型大的个体兜得更远，聚焦喷口把雾送得更远。它也是本招的实际射程与指示范围。"
            }),
        /** 楔角：72 + 特攻偏移[−8,14]；聚焦 ×0.55；夹 26..96。 */
        sprayAngle: formula(
            F.base(72)
                .plus(F.stat("specialAttack").minus(50).times(0.1).clamp(-8, 14))
                .times(F.when(F.pref("focus"), F.const(0.55), F.const(1)))
                .clamp(26, 96).round(0),
            "楔角", {
                unit: "度",
                description: "酸雾在身前张开的整角；特攻越高铺得越开，聚焦喷口把它收成一条窄喷。"
            }),
        /** 残雾时长：40 + 等级(≥25)偏移[0,26] + 特攻偏移[−4,12]；聚焦 ×0.7；夹 24..96。 */
        cloudTicks: seconds(
            F.base(40)
                .plus(F.level().minus(25).times(0.8).clamp(0, 26))
                .plus(F.stat("specialAttack").minus(50).times(0.15).clamp(-4, 12))
                .times(F.when(F.pref("focus"), F.const(0.7), F.const(1)))
                .clamp(24, 96).round(0),
            "残雾时长", "酸雾在空气里停留多久；等级与特攻越高、宽喷形态留得越久，聚焦喷口很快收干。"),
        /** 酸滴数：14 + 特攻偏移[−2,8] + 等级(≥25)偏移[0,9]；夹 10..44。 */
        droplets: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(50).times(0.16))
                .plus(F.level().minus(25).times(0.35))
                .clamp(10, 44).round(),
            "酸滴数", {
                unit: "滴",
                description: "一次喷出的酸滴数量，也驱动表现的密度；特攻与等级越高喷得越密。"
            }),
        /** 碾防级数：本招固定 2 级特防，与原生一致。 */
        sunderStages: formula(
            F.base(2),
            "碾防级数", {
                unit: "级",
                description: "一次喷淋让目标特防下降的能力等级；原生「大幅降低」即固定 2 级。"
            }),
        /** 起手：9 − 速度偏移[−? ,?]；聚焦 +2；夹 5..14。 */
        tempo: seconds(
            F.base(9)
                .minus(F.stat("speed").minus(50).times(0.04))
                .plus(F.when(F.pref("focus"), F.const(2), F.const(0)))
                .clamp(5, 14).round(),
            "起手", "鼓起酸囊、把雾压到口边再喷出的时间；速度越快越短，聚焦喷口多花一点。")
    });

    defineDamage("acidspray", "core", {});
    defineDamage("acidspray", "drift", {});

    stages("acidspray", [
        { level: 30, values: { core: 44, sprayRange: 5.4 } }
    ]);

    describe("acidspray", [
        { key: "description.0", values: ["core","sunderStages"] },
        { key: "description.1", values: ["sprayRange", "sprayAngle"] },
        { key: "description.2", values: ["cloudTicks","drift","sunderStages"] },
        { key: "focus.on", values: ["core", "sprayRange", "sprayAngle"],
            when: function (context) { return read(context.detail.values, ["focus"]) === true; } },
        { key: "focus.off", values: ["sprayRange", "sprayAngle"],
            when: function (context) { return read(context.detail.values, ["focus"]) !== true; } },
        { key: "timing", values: ["sprayRange", "tempo", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.core", "tier.0.sprayRange"] }
    ]);
}
