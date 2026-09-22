/**
 * 木角 / hornleech —— 参数与伤害段。
 *
 * 原生事实：Grass／物理／威力 75／命中 100／PP 10／接触／吸取一半伤害（Cobblemon 1.8，仅 6 位已实装学习者）。
 *
 * 核心念头：低头、木角朝前撞进去，角扎在对手肉里，养分顺着角身一路抽回自己身上——它是本族里唯一
 * **用身体出手**的吸招：整段位移 ＋ 贴身贯穿，力量来自体格而非念力。
 * 翻译：一记带位移的接触冲撞；命中即结算 `gore` 物理伤害并把伤口处的养分沿「目标→自身」抽回（共享 `drain`）。
 *
 * 与家族分开：三条特殊吸路都不移动身体（吸取探藤、超级吸取抛荚、终极吸取立根），只有木角用角撞进去；
 * 只有它可能贯穿到第二个目标，也只有它的力量随体重与物攻长。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   gore     贯穿威力 75 + 物攻偏移 + 体重偏移；贯穿式 ×0.95（分给第二个目标）。
 *   sap      回血比例 0.50 + 物攻偏移；贯穿式 ×0.85（角上分走的养分更薄）。
 *   reach    冲出距离 3.0 + 速度 + 体重；贯穿式 ×1.15。也是实际射程来源，身体重、腿快的个体冲得更远。
 *   charge   冲撞速度 0.8 + 速度偏移。
 *   tusk     角尖判定 0.42 + 体型身高偏移。
 *   tempo／aftercast／recharge 速度决定起手、收招与冷却。
 *
 * 配置 `gore`（贯穿式）双向取舍：开＝冲得更远、可穿过一个目标继续扎第二个，但每个目标吸得更少、收招更慢；
 * 关＝只扎一个、吸得足、收得快。两向各有局面（穿阵 vs 续航）。
 *
 * 伤害段 `gore` 与参数同名，走共享换算（原生类别 Physical，Grass 属性，接触）。
 */
namespace PokemonSkills {
    actionParameters.define("hornleech", {
        /** 贯穿威力：75 + 物攻偏移[−10,26] + 体重偏移[−5,12]；贯穿式 ×0.95；夹 50..124。 */
        gore: formula(
            F.base(75).plus(F.stat("attack").minus(65).times(0.40).clamp(-10, 26))
                .plus(F.body("weight").minus(50).times(0.15).clamp(-5, 12))
                .times(F.when(F.pref("gore", text("worldcombat.skill.hornleech.preference.gore")), F.const(0.95), F.const(1)))
                .clamp(50, 124).round(1),
            "贯穿威力", {
                unit: "威力",
                description: "木角扎进去这一下的基础威力；物攻越高、身体越重撞得越狠，贯穿式为分给第二个目标略降。对手防御、相性与暴击在命中时另算。"
            }),
        /** 回血比例：0.50 + 物攻偏移[−0.02,0.05]；贯穿式 ×0.85；夹 0.38..0.58。 */
        sap: percent(
            F.base(0.50).plus(F.stat("attack").minus(65).times(0.0007).clamp(-0.02, 0.05))
                .times(F.when(F.pref("gore", text("worldcombat.skill.hornleech.preference.gore")), F.const(0.85), F.const(1)))
                .clamp(0.38, 0.58),
            "汲取比例", "扎中造成的伤害转为自身回复的比例（原生一半）；物攻高抽得更足，贯穿式角上分走的养分更薄。"),
        /** 冲出距离：3.0 + 速度偏移[−0.4,0.9] + 体重偏移[−0.2,0.4]；贯穿式 ×1.15；夹 2.4..5.2。 */
        reach: formula(
            F.base(3.0).plus(F.stat("speed").minus(55).times(0.015).clamp(-0.4, 0.9))
                .plus(F.body("weight").minus(50).times(0.004).clamp(-0.2, 0.4))
                .times(F.when(F.pref("gore", text("worldcombat.skill.hornleech.preference.gore")), F.const(1.15), F.const(1)))
                .clamp(2.4, 5.2).round(2),
            "冲出距离", {
                unit: "格",
                description: "从起步到角尖够到的最远位移，也是本招的实际射程来源；腿快、身体重的个体冲得更远。"
            }),
        /** 冲撞速度：0.8 + 速度偏移[−0.15,0.35]；夹 0.6..1.2。 */
        charge: formula(
            F.base(0.8).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.15, 0.35)).clamp(0.6, 1.2).round(2),
            "冲撞速度", {
                unit: "格/刻",
                description: "低头冲出去时每刻前进的距离；速度快的个体冲得更急，目标更难在角到之前走开。"
            }),
        /** 角尖判定：0.42 + 身高偏移[−0.06,0.30]；夹 0.32..0.72。 */
        tusk: formula(
            F.base(0.42).plus(F.body("height").minus(1.3).times(0.14).clamp(-0.06, 0.30)).clamp(0.32, 0.72).round(2),
            "角尖判定", {
                unit: "格",
                description: "木角扫过的横向判定半径；个高的个体角更长更粗，更不容易被侧身让开。"
            }),
        /** 起手：8 − 速度偏移[−2,3] + 贯穿式 2；夹 5..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-3, 2))
                .plus(F.when(F.pref("gore", text("worldcombat.skill.hornleech.preference.gore")), F.const(2), F.const(0)))
                .clamp(5, 13).round(0),
            "起手", "低头刨地、把重心压到角上的时间；速度越快越短，贯穿式要沉得更久。"),
        /** 收招：9 − 速度偏移[−2,3] + 贯穿式 3；夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-3, 2))
                .plus(F.when(F.pref("gore", text("worldcombat.skill.hornleech.preference.gore")), F.const(3), F.const(0)))
                .clamp(5, 14).round(0),
            "收招", "把角拔出来、稳住身形的收势；贯穿式冲得更远，收得更慢。"),
        /** 冷却：40 − 速度偏移[−6,4] + 贯穿式 6；夹 28..54。 */
        recharge: seconds(
            F.base(40).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 6))
                .plus(F.when(F.pref("gore", text("worldcombat.skill.hornleech.preference.gore")), F.const(6), F.const(0)))
                .clamp(28, 54).round(0),
            "冷却", "两次冲撞之间的等待；贯穿式回得更慢。"),
        minimumMove: hidden(0.04)
    });

    stages("hornleech", [
        { level: 26, values: { gore: 88 } },
        { level: 46, values: { gore: 100, sap: 0.53 } }
    ]);

    defineDamage("hornleech", "gore", { defenceCoefficient: 0.005,
        rationale: "木角贯穿的接触吸取，防御按默认系数减伤。" }, { contact: true });

    describe("hornleech", [
        { key: "description.0", values: ["gore"] },
        { key: "description.1", values: ["reach", "charge", "tusk"] },
        { key: "description.2", values: ["sap"] },
        { key: "gore.on", values: [], when: function (context) { return read(context.detail.values, ["gore"]) === true; } },
        { key: "gore.off", values: [], when: function (context) { return read(context.detail.values, ["gore"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gore"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.gore", "tier.1.sap"] }
    ]);
}
