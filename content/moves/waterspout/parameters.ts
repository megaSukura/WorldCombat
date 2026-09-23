/**
 * 喷水 / waterspout 的参数与伤害段。
 *
 * 原生事实：Water／特殊／威力 150 ×（自身 HP / 最大 HP）／命中 100／PP 5／target allAdjacentFoes，
 *   无次要效果（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「掀起潮水」落成一道**从脚下向外推涌的潮墙**——水先在地上兜起来（起手），再整圈漫出去：
 *   潮头扫过谁，谁就挨一次浪、被推着走、浇得湿透；水还把身上的火浇熄。满血时水势最大，越虚弱越小。
 *   与同族分开：喷火是瞬时内向外的爆发、点着人；巨龙威能是一道前向龙息；喷水是唯一**会移动、会推人、
 *   会浇灭、会留下湿身**的一招。下雨时全场的水都更足，它跟着变强（读世界天气）。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   surge         浪头威力：原生 150 乘 HP 比例，特攻给出水的压强，下雨再抬一档。
 *   waveDistance  潮头推多远：特攻与水量的体重共同决定，下雨推得更远。
 *   waveTicks     潮墙推完要多久：速度决定水漫得快不快。
 *   carry         推/拉距离：特攻与体重决定这一推把人带多远（回卷式改拉向自己）。
 *   soakTicks     湿身时长：等级与当前血量决定，回卷式湿得更久。
 *   frontThickness 潮头厚度：体型宽度决定这道墙有多厚。
 *   volume        水量：体重派生，同时驱动画面密度。
 *   undertow      配置：回卷式把推改为拉、湿得更久，但浪头更弱、推得更近。
 *
 * 伤害段 `surge` 走共享换算（原始类别 Special）；湿身走共享身份 `world_combat:status/soaked`
 * （本单元效果 world_combat:waterspout_soaked），灼伤由水浇灭。
 */
namespace PokemonSkills {
    actionParameters.define("waterspout", {
        /** 浪头威力：150 + 特攻偏移[−20,52]，整体乘 HP 比例 0.20..1.00，再乘下雨加成 1.00..1.25；回卷 ×0.82；夹 12..300。 */
        surge: formula(
            F.base(150).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-20, 52))
                .times(F.stat("hpRatio").scale(0.20, 1.0).as("HP 比例"))
                .times(F.const(1).plus(F.world("rain").times(0.25)).as("雨天加成"))
                .times(F.when(F.pref("undertow"), F.const(0.82), F.const(1)))
                .clamp(12, 300).round(1),
            "浪头威力", {
                unit: "威力",
                description: "潮头扫过时对每个敌人结算的基础威力；原生 150 乘当前 HP 比例，满血最盛、越虚弱越小，特攻越高水压越足，下雨时再加成。回卷式把能量摊薄。对手特防、相性与暴击在命中时另算。"
            }),
        /** 潮头距离：3.2 + 特攻偏移[−0.6,1.6] + 体重偏移[0,1.0] + 下雨[0,0.6]；回卷 ×0.9；夹 2.4..6.4。 */
        waveDistance: formula(
            F.base(3.2).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.6, 1.6))
                .plus(F.body("weight").minus(60).times(0.006).clamp(0, 1.0))
                .plus(F.world("rain").times(0.6))
                .times(F.when(F.pref("undertow"), F.const(0.9), F.const(1)))
                .clamp(2.4, 6.4).round(2),
            "潮头距离", {
                unit: "格",
                description: "潮墙最多推多远；特攻高、水量大（体重）的个体漫得更远，下雨时更盛，回卷式稍近。它也是本招的实际射程与指示圈半径。"
            }),
        /** 推涌时长：22 − 速度偏移[−3,6]；夹 14..30。 */
        waveTicks: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.12).clamp(-3, 6)).clamp(14, 30).round(0),
            "推涌时长", "潮墙从脚下推到最远要多久；速度快的个体水漫得更急、留给人走开的窗口更短。"),
        /** 推/拉距离：0.5 + 特攻偏移[−0.15,0.5] + 体重偏移[0,0.5]；夹 0.3..1.5。 */
        carry: formula(
            F.base(0.5).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.15, 0.5))
                .plus(F.body("weight").minus(60).times(0.003).clamp(0, 0.5)).clamp(0.3, 1.5).round(2),
            "推涌距离", {
                unit: "格",
                description: "潮头把人沿背离方向推多远；回卷式把方向反过来，把人拉向自己。特攻越高、体重越大带得越远。"
            }),
        /** 湿身时长：90 + 等级 ×0.9 + HP 比例 ×40；回卷 ×1.4；夹 60..240。 */
        soakTicks: seconds(
            F.base(90).plus(F.level().times(0.9)).plus(F.stat("hpRatio").times(40))
                .times(F.when(F.pref("undertow"), F.const(1.4), F.const(1)))
                .clamp(60, 240).round(0),
            "湿身时长", "被浇到后带着湿透身份多久（移动稍慢）；等级越高、自身血量越满留得越久，回卷式更久。"),
        /** 潮头厚度：0.7 + 宽度 ×0.5；夹 0.6..1.6。 */
        frontThickness: formula(
            F.base(0.7).plus(F.body("width").times(0.5)).clamp(0.6, 1.6).round(2),
            "潮头厚度", {
                unit: "格",
                description: "这道潮墙有多厚；身板越宽墙越厚，一次能罩住的贴地目标更多。"
            }),
        /** 水量：60 + 体重偏移[−10,80]；夹 40..160。 */
        volume: formula(
            F.base(60).plus(F.body("weight").minus(60).times(0.3).clamp(-10, 80)).clamp(40, 160).round(0),
            "水量", {
                unit: "点",
                description: "潮水的水量；体重越大水越多，画面里的浪花密度按它发射。"
            })
    });

    defineDamage("waterspout", "surge", {});

    stages("waterspout", [
        { level: 45, values: { cooldown: 40 } },
        { level: 62, values: { cooldown: 34 } }
    ]);

    describe("waterspout", [
        { key: "description.0", values: ["surge", "waveDistance"] },
        { key: "description.1", values: ["waveTicks","carry","soakTicks"] },
        { key: "description.douse", values: [] },
        { key: "undertow.on", values: [], when: function (context) { return read(context.detail.values, ["undertow"]) === true; } },
        { key: "undertow.off", values: [], when: function (context) { return read(context.detail.values, ["undertow"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] }
    ]);
}
