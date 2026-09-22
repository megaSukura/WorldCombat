/**
 * 吸取 / absorb —— 参数与伤害段。
 *
 * 原生事实：Grass／特殊／威力 20／命中 100／PP 25／吸取一半伤害（Cobblemon 1.8，86 位已实装学习者）。
 *
 * 核心念头：从身侧探出一根嫩藤轻点对手，立刻把一点汁液掸回自己身上——它是这一族里最短、最省、最快的一口。
 * 翻译：把「吸取对手的养分」落成一记**不脱手的一啄**——没有飞出去的东西，只有一根从施法者身上伸出的藤，
 * 点中即抽；命中伤害的一半转为回复（走共享伤害载荷的 `drain`）。
 *
 * 与家族分开：超级吸取把孢荚抛出去、终极吸取从地里拱出大根、木角用身体撞；只有吸取是**藤不脱手**的一啄，
 * 藤的长度就是它的射程，画面上看得到它从身上直接伸出去。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   sip       单口威力 20 + 特攻偏移；缠根式 ×1.2。藤点得越重，抽回来的也越多。
 *   sap       回血比例 0.50 + 特攻偏移；缠根式再 +0.06。同一招在特攻高的个体手里抽得更足。
 *   reach     藤长 4.2 + 速度偏移；缠根式 ×1.15。也是实际射程来源，速度决定它够得着多远。
 *   lash      藤尖判定 0.36 + 体型身高偏移。个高的个体藤条更粗，更难被侧身让开。
 *   tempo／aftercast／recharge 速度决定起手、收招与冷却——这是它最省的地方。
 *
 * 配置 `grasp`（缠根式）双向取舍：开＝藤更长更粗、单口更重、抽得更足，但起手更慢、冷却更久；
 * 关＝快摘式，出手快、回得快，但够得近、抽得少。两向各有局面（先手压制 vs 续航）。
 *
 * 伤害段 `sip` 与参数同名，走共享换算（原生类别 Special，Grass 属性）。
 */
namespace PokemonSkills {
    actionParameters.define("absorb", {
        /** 单口威力：20 + 特攻偏移[−5,9]；缠根式 ×1.2；夹 12..36。 */
        sip: formula(
            F.base(20).plus(F.stat("specialAttack").minus(40).times(0.16).clamp(-5, 9))
                .times(F.when(F.pref("grasp", text("worldcombat.skill.absorb.preference.grasp")), F.const(1.2), F.const(1)))
                .clamp(12, 36).round(1),
            "汲取威力", {
                unit: "威力",
                description: "藤尖点中这一下的基础威力；特攻越高抽得越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 回血比例：0.50 + 特攻偏移[−0.02,0.05]；缠根式 +0.06；夹 0.44..0.60。 */
        sap: percent(
            F.base(0.50).plus(F.stat("specialAttack").minus(40).times(0.0006).clamp(-0.02, 0.05))
                .plus(F.when(F.pref("grasp", text("worldcombat.skill.absorb.preference.grasp")), F.const(0.06), F.const(0)))
                .clamp(0.44, 0.60),
            "汲取比例", "这一口造成的伤害转为自身回复的比例（原生一半）；特攻高、缠根式抽得更足。"),
        /** 藤长：4.2 + 速度偏移[−0.5,0.9]；缠根式 ×1.15；夹 3.4..6.2。 */
        reach: formula(
            F.base(4.2).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.5, 0.9))
                .times(F.when(F.pref("grasp", text("worldcombat.skill.absorb.preference.grasp")), F.const(1.15), F.const(1)))
                .clamp(3.4, 6.2).round(2),
            "藤长", {
                unit: "格",
                description: "从身侧探出的嫩藤有多长，也是本招的实际射程来源；腿快的个体伸得更远。"
            }),
        /** 藤尖判定：0.36 + 身高偏移[−0.05,0.22]；夹 0.30..0.60。 */
        lash: formula(
            F.base(0.36).plus(F.body("height").minus(1.2).times(0.12).clamp(-0.05, 0.22)).clamp(0.30, 0.60).round(2),
            "藤尖判定", {
                unit: "格",
                description: "藤尖扫过的横向判定半径；个高的个体藤条更粗，更不容易被侧身让开。"
            }),
        /** 起手：5 − 速度偏移[−1,2] + 缠根式 3；夹 3..11。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 1))
                .plus(F.when(F.pref("grasp", text("worldcombat.skill.absorb.preference.grasp")), F.const(3), F.const(0)))
                .clamp(3, 11).round(0),
            "起手", "探藤前的蓄势；速度越快越短，缠根式要多扎一会儿。"),
        /** 收招：5 − 速度偏移[−1,2] + 缠根式 2；夹 3..10。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 1))
                .plus(F.when(F.pref("grasp", text("worldcombat.skill.absorb.preference.grasp")), F.const(2), F.const(0)))
                .clamp(3, 10).round(0),
            "收招", "抽完把藤缩回来、理一下的收势；缠根式收得慢。"),
        /** 冷却：20 − 速度偏移[−2,4] + 缠根式 6；夹 12..32。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 2))
                .plus(F.when(F.pref("grasp", text("worldcombat.skill.absorb.preference.grasp")), F.const(6), F.const(0)))
                .clamp(12, 32).round(0),
            "冷却", "两次探藤之间的等待；它是本族最短的冷却，快摘式回得尤其快。")
    });

    stages("absorb", [
        { level: 16, values: { sip: 25 } },
        { level: 34, values: { sip: 31, sap: 0.53, reach: 4.6 } }
    ]);

    defineDamage("absorb", "sip", { defenceCoefficient: 0.005,
        rationale: "嫩藤吸取的一小口，防御按默认系数减伤。" }, {});

    describe("absorb", [
        { key: "description.0", values: ["sip"] },
        { key: "description.1", values: ["reach", "lash"] },
        { key: "description.2", values: ["sap"] },
        { key: "grasp.on", values: [], when: function (context) { return read(context.detail.values, ["grasp"]) === true; } },
        { key: "grasp.off", values: [], when: function (context) { return read(context.detail.values, ["grasp"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sip"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sip", "tier.1.sap", "tier.1.reach"] }
    ]);
}
