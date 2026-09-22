/**
 * 清除浓雾 / Defog —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Flying／变化／威力 —／命中 —／PP 15／目标对手单体；效果是吹走对手一侧的
 *   反射壁、光墙等（并清掉双方场上的撒菱／隐形岩／毒菱／黏网等），同时把对手的闪避率下降一级；
 *   flags 含 protect、mirror、defrost。138 位已实装学习者，是全族最普及的一式打扫。
 *
 * 世界化：这是一记**以自身为轴旋起、向外推开一圈的清扫风**——没有伤害，没有击退；风圈扫过的地方，
 *   对手身上的反射壁、光墙、极光幕、白雾、神秘守护一起被抹掉，地面上的烟幕与撒菱／隐形岩／黏网／
 *   毒菱被整片掀走，圈里的对手被吹得门户大开（破防、闪避下降）。它是本族唯一「不打人、只打扫」的招，
 *   站到风圈之外就什么都不受影响。
 *
 * 数值为什么依赖这些精灵数据、并分散到不同参数：
 *   sweep    清扫半径：速度（旋得越快风圈越开）＋等级（经验越足控风越稳）。
 *   strip    闪避削弱：等级台阶（老练的个体这一扫更准地剥掉守势）。
 *   expose   破防级数：速度（风锋切得越利落，门户开得越大）。
 *   linger   破绽时长：等级（越老练，吹开的空当留得越久）。
 *   motes    风尘数量：体宽（身形越大卷起的气流越厚）＋速度；它同时是画面里风丝的数量。
 *   tempo    起手：速度（越快越快旋起来）。
 *   aftercast 收招：速度（越快收得越利落）。
 *   recharge 冷却：等级（越熟练回得越快），烈风式略久。
 *
 * 配置 `gale`（烈风）双向取舍：开启＝半径 ×1.28、闪避多剥一级、破绽 ×1.15，但起手 +2 刻、冷却 ×1.15；
 *   关闭＝轻扫，半径与削弱都小一点，换来更短的起手与冷却。两向各有适用局面（大范围一次抹平 vs. 频繁小扫）。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。本招没有伤害段。
 */
namespace PokemonSkills {
    actionParameters.define("defog", {
        /** 清扫半径：6 + 速度偏移[−1.5,3] + 等级(≥25)偏移[0,1.5]；烈风 ×1.28；夹 4..12。 */
        sweep: formula(
            F.base(6)
                .plus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 3))
                .plus(F.level().minus(25).times(0.03).clamp(0, 1.5))
                .times(F.when(F.pref("gale", text("worldcombat.skill.defog.preference.gale")), F.const(1.28), F.const(1)))
                .clamp(4, 12).round(2),
            "清扫半径", {
                unit: "格",
                description: "风圈从自身向外扫到多远；速度越快旋得越开、等级越高控得越稳，烈风式再大一圈。它也是本招的实际射程与指示圈半径。"
            }),
        /** 闪避削弱：1 + 等级(≥40)追加 1 + 烈风追加 1；夹 1..3。 */
        strip: formula(
            F.base(1).plus(F.level().gte(40)).plus(F.when(F.pref("gale", text("worldcombat.skill.defog.preference.gale")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "闪避削弱", {
                unit: "级",
                description: "被扫到的对手闪避等级下降多少（宝可梦记在原生等级上）；等级高的个体剥得更深，烈风式再多一级。"
            }),
        /** 破防级数：1 + 速度偏移[0,1.5] + 烈风追加 1；夹 1..3。 */
        expose: formula(
            F.base(1)
                .plus(F.stat("speed").minus(55).times(0.012).clamp(0, 1.5))
                .plus(F.when(F.pref("gale", text("worldcombat.skill.defog.preference.gale")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "破防级数", {
                unit: "级",
                description: "对手的防御等级下降多少（对原版生物与玩家落到护甲上）；速度越快风锋越利落，烈风式再深一级。"
            }),
        /** 破绽时长：160 + 等级(≥25)偏移[0,180]；烈风 ×1.15；夹 90..340。 */
        linger: seconds(
            F.base(160)
                .plus(F.level().minus(25).times(2).clamp(0, 180))
                .times(F.when(F.pref("gale", text("worldcombat.skill.defog.preference.gale")), F.const(1.15), F.const(1)))
                .clamp(90, 340).round(0),
            "破绽时长", "被吹开的门户留多久；等级越高留得越久，烈风式再长一点。"),
        /** 风尘数量：18 + 体宽偏移[0,14] + 速度偏移[−2,10]；夹 12..42。 */
        motes: formula(
            F.base(18)
                .plus(F.body("width").minus(0.9).times(10).clamp(0, 14))
                .plus(F.stat("speed").minus(55).times(0.2).clamp(-2, 10))
                .clamp(12, 42).round(0),
            "风尘数量", {
                unit: "缕",
                description: "风圈里卷起的风丝与尘点数量；身形越宽、速度越快越浓，也是画面里风流的发射量来源。"
            }),
        /** 起手：8 − 速度偏移[−1.5,2] + 烈风 2；夹 5..13。 */
        tempo: seconds(
            F.base(8)
                .minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("gale", text("worldcombat.skill.defog.preference.gale")), F.const(2), F.const(0)))
                .clamp(5, 13).round(0),
            "起手", "把风旋起来再推出去的时间；速度越快越短，烈风式要多蓄一下。"),
        /** 收招：7 − 速度偏移[−1.5,2]；夹 4..11。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.025).clamp(-1.5, 2)).clamp(4, 11).round(0),
            "收招", "风散之后站稳的收势；速度越快越利落。"),
        /** 冷却：30 − 等级(≥25)偏移[0,7]；烈风 ×1.15 / 轻扫 ×0.9；夹 16..46。 */
        recharge: seconds(
            F.base(30).minus(F.level().minus(25).times(0.14).clamp(0, 7))
                .times(F.when(F.pref("gale", text("worldcombat.skill.defog.preference.gale")), F.const(1.15), F.const(0.9)))
                .clamp(16, 46).round(0),
            "冷却", "两次起风之间的等待；等级越高回得越快。它是一记便宜、可以反复打扫的招。")
    });

    stages("defog", [
        { level: 35, values: { sweep: 7 } },
        { level: 52, values: { sweep: 8, strip: 2, motes: 26 } }
    ]);

    describe("defog", [
        { key: "description.0", values: ["sweep"] },
        { key: "description.1", values: ["strip", "expose", "linger"] },
        { key: "description.2", values: ["motes"] },
        { key: "gale.on", values: [], when: function (context) { return read(context.detail.values, ["gale"]) === true; } },
        { key: "gale.off", values: [], when: function (context) { return read(context.detail.values, ["gale"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sweep"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sweep", "tier.1.strip", "tier.1.motes"] }
    ]);
}
