/**
 * 粉尘 / Powder —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Bug／变化／威力 —／命中 100／PP 20／目标相邻单体；
 *   flags 含 powder（粉末类，草属性对粉末免疫）。被撒上粉尘的对手一旦使用火属性招式，粉尘就会爆炸，
 *   对它造成自身最大生命 1/4 的伤害。3 位已实装学习者。
 *
 * 世界化：把「预先撒粉、等火引爆」落成一记**精准的陷阱投掷**——施法者朝选定的对手抛出一团粉尘，
 *   命中后粉尘贴在它身上（草属性直接穿过）。之后它每使用一次火属性招式，身上的粉尘就当场炸开，
 *   对它造成一段按施法者特攻定级的自伤。它和粉系四式不同：毒粉／麻痹粉／催眠粉是命中即施加状态，
 *   而粉尘是**先埋一颗、等对手自己点火**——对手越依赖火招，这一手越值。
 *
 * 数值为什么依赖这些精灵数据、并分散到不同参数：
 *   blast     爆炸伤害：特攻（粉尘越细爆得越重）＋配置；占被引爆者最大生命的比例。
 *   dustTicks 粉尘粘附时长：等级（越老练粉尘越黏）＋配置。
 *   reach     投掷距离：速度（抛得远）。
 *   puffSpeed 粉团初速：速度（抛得急）。
 *   radius    判定半径：身高（粉团越大）。
 *   motes     尘粒数量：特攻；它同时是画面里粉团与爆炸烟尘的发射量。
 *   tempo/aftercast/recharge 速度与等级决定起手、收招与冷却。
 *
 * 配置 `volatile`（易爆）双向取舍：开启＝爆炸伤害 ×1.3，但粘附时长 ×0.85、冷却 ×1.1，适合逼对手立刻收火；
 *   关闭＝粘得更久、冷却 ×0.95、伤害略低，适合慢慢磨。两向各有适用局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。本招没有伤害段（爆炸是对被引爆者自身结算的自伤）。
 */
namespace PokemonSkills {
    actionParameters.define("powder", {
        /** 爆炸伤害：0.22 + 特攻偏移[−0.03,0.06]；易爆 ×1.3；夹 0.15..0.30。 */
        blast: percent(
            F.base(0.22).plus(F.stat("specialAttack").minus(60).times(0.0008).clamp(-0.03, 0.06))
                .times(F.when(F.pref("volatile", text("worldcombat.skill.powder.preference.volatile")), F.const(1.3), F.const(1)))
                .clamp(0.15, 0.30),
            "爆炸伤害", "粉尘被火引爆时，对被撒上的对手造成其最大生命多少比例的自伤；特攻越高爆得越重，易爆式再放大三成。"),
        /** 粘附时长：240 + 等级(≥25)偏移[0,200]；易爆 ×0.85；夹 140..440。 */
        dustTicks: seconds(
            F.base(240)
                .plus(F.level().minus(25).times(3).clamp(0, 200))
                .times(F.when(F.pref("volatile", text("worldcombat.skill.powder.preference.volatile")), F.const(0.85), F.const(1)))
                .clamp(140, 440).round(0),
            "粘附时长", "粉尘能在对手身上留多久；等级越高粘得越久，易爆式留得短一些。"),
        /** 投掷距离：8 + 速度偏移[−1.5,3]；夹 6..12。 */
        reach: formula(
            F.base(8).plus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 3)).clamp(6, 12).round(2),
            "投掷距离", {
                unit: "格",
                description: "粉团能抛到多远的对手身上，也是本招的实际射程来源；速度越快抛得越远。"
            }),
        /** 粉团初速：1.1 + 速度偏移[−0.2,0.6]；夹 0.8..1.7。 */
        puffSpeed: formula(
            F.base(1.1).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.2, 0.6)).clamp(0.8, 1.7).round(2),
            "粉团初速", {
                unit: "格/刻",
                description: "粉团脱手飞向对手的速度；速度快的个体抛得更急，对手更难在它贴上之前走开。"
            }),
        /** 判定半径：0.26 + 身高偏移[−0.04,0.2]；夹 0.22..0.5。 */
        radius: formula(
            F.base(0.26).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.04, 0.2)).clamp(0.22, 0.5).round(2),
            "判定半径", {
                unit: "格",
                description: "粉团飞行与命中的判定半径；体型越高粉团越大。"
            }),
        /** 尘粒数量：16 + 特攻偏移[0,18]；夹 10..40。 */
        motes: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(0, 18)).clamp(10, 40).round(0),
            "尘粒数量", {
                unit: "粒",
                description: "粉团飞行与爆炸时撒出的尘粒数量；特攻越高越密，也是画面里粉尘的发射量来源。"
            }),
        /** 起手：8 − 速度偏移[−1.5,2]；夹 5..12。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2)).clamp(5, 12).round(0),
            "起手", "拢起这团粉尘再脱手的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−1.5,2]；夹 4..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.025).clamp(-1.5, 2)).clamp(4, 10).round(0),
            "收招", "抛出后站稳的收势；速度越快越利落。"),
        /** 冷却：34 − 等级(≥25)偏移[0,8]；易爆 ×1.1 / 稳埋 ×0.95；夹 20..50。 */
        recharge: seconds(
            F.base(34).minus(F.level().minus(25).times(0.16).clamp(0, 8))
                .times(F.when(F.pref("volatile", text("worldcombat.skill.powder.preference.volatile")), F.const(1.1), F.const(0.95)))
                .clamp(20, 50).round(0),
            "冷却", "两次埋粉之间的等待；等级越高回得越快，易爆式更费。")
    });

    stages("powder", [
        { level: 35, values: { motes: 22, dustTicks: 300 } },
        { level: 52, values: { blast: 0.26, reach: 9, motes: 28 } }
    ]);

    describe("powder", [
        { key: "description.0", values: ["reach", "puffSpeed", "radius"] },
        { key: "description.1", values: ["dustTicks"] },
        { key: "description.2", values: ["blast"] },
        { key: "volatile.on", values: [], when: function (context) { return read(context.detail.values, ["volatile"]) === true; } },
        { key: "volatile.off", values: [], when: function (context) { return read(context.detail.values, ["volatile"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.dustTicks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blast", "tier.1.reach"] }
    ]);
}
