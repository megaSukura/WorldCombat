/**
 * 紧束 / wrap 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 15／命中 90／PP 20／优先度 0／接触，volatile partiallytrapped（4–5 回合）。
 * 描述「使用长长的身体或藤蔓等，在 4～5 回合内紧束对手进行攻击」。
 *
 * 翻译：保留「用长长的身体或藤蔓把对手裹住、持续绞紧」，落成即时战斗里**一圈自下而上缠住目标的藤茧**：
 * 命中就把目标钉在原地、把它的力气一并压住（攻击等级下降），此后藤茧自己收紧，不需要施法者维持——
 * 甩完就能走开。每隔一会儿绞一次伤害。目标是**真的被钉住**：动不了、打不痛，只能等藤茧走完，
 * 或被外力一脚踹到足够快把它撕开。
 *
 * 与同族分开（束缚对的两招，命中后世界继续变化）：
 *   绑紧 —— 绳系在施法者身上，把目标拴在身边拖着走、越拉越紧，施法者也被拖慢；
 *   紧束 —— 藤茧留在目标身上（施法者可离开），把它钉住并压住攻击，伤害平稳不递增。
 *   与已有的缠绕（一次性减速＋短定身）不同：紧束是**独立留在目标身上的持续禁锢**。
 *
 * 数据分散（每项读不同的精灵数据，目标侧也用目标事实）：
 *   crush      每绞一下的威力：物攻给绞劲，等级拾级抬升；密缠式更重。
 *   coilTicks  藤茧持续：等级决定留多久；密缠式更久。
 *   interval   两绞间隔：速度决定绞得多密；密缠式更疏。
 *   reach      出手距离：身高给藤蔓甩出的长度，也是实际射程。
 *   grip       抓取判定：体宽给裹住的容差。
 *   atkStages  压住的攻击等级：基础 1，**目标物攻高（≥100）时再多一级**；密缠式再补一级。
 *   tearSpeed  撕开阈值：物攻给藤茧的紧度（越紧越难撕）；密缠式更难。
 *   coilHeight 藤茧高度：**目标体型高度**决定藤茧裹多高。
 *   notes      藤屑数量：物攻换算，表现按它发射。
 *   tempo／aftercast／recharge：速度定节奏，等级让冷却回得更快；密缠式整体更缓。
 *
 * 配置 `cocoon`（密缠式，默认关）双向取舍：开＝藤茧留得久、每绞更重、再压一级攻击、更难被撕开，但绞得更疏、
 * 冷却更久；关（速缠式）＝绞得密、冷却短，快速压一轮，但持续短、压制轻。两向各有局面（长锁 vs 快压）。
 *
 * 伤害段 `crush` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("wrap", {
        /** 绞击威力：15 + 物攻偏移[−5,20] + 等级(≥20)偏移[0,10]；密缠 ×1.15 / 速缠 ×0.95；夹 10..52。 */
        crush: formula(
            F.base(15)
                .plus(F.stat("attack").minus(55).times(0.2).clamp(-5, 20))
                .plus(F.level().minus(20).times(0.2).clamp(0, 10))
                .times(F.when(F.pref("cocoon", text("worldcombat.skill.wrap.preference.cocoon")), F.const(1.15), F.const(0.95)))
                .clamp(10, 52).round(1),
            "绞击威力", {
                unit: "威力",
                description: "藤茧每绞一下结算一次的基础威力；物攻给绞劲，密缠式更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 藤茧持续：130 + 等级(≥25)偏移[0,50]；密缠 ×1.25；夹 80..240 刻。 */
        coilTicks: seconds(
            F.base(130).plus(F.level().minus(25).times(1.0).clamp(0, 50))
                .times(F.when(F.pref("cocoon", text("worldcombat.skill.wrap.preference.cocoon")), F.const(1.25), F.const(1)))
                .clamp(80, 240).round(0),
            "藤茧持续", "藤茧在目标身上留多久；期间目标被钉住、攻击被压低、每隔一会儿被绞一次。"),
        /** 两绞间隔：26 − 速度偏移[−7,7]；密缠 ×1.2 / 速缠 ×0.9；夹 12..34 刻。 */
        interval: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.06).clamp(-7, 7))
                .times(F.when(F.pref("cocoon", text("worldcombat.skill.wrap.preference.cocoon")), F.const(1.2), F.const(0.9)))
                .clamp(12, 34).round(0),
            "两绞间隔", "藤茧两次收紧之间隔多久；速度越快绞得越密，速缠式更快。"),
        /** 出手距离：2.6 + 身高偏移[−0.2,0.7]；夹 2.2..3.6 格。 */
        reach: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.7)).clamp(2.2, 3.6).round(2),
            "出手距离", {
                unit: "格",
                description: "藤蔓能甩出去多远裹住目标；身高给长度，也是本招的实际射程来源。这是一记贴身招。"
            }),
        /** 抓取判定：0.5 + 体宽偏移[−0.05,0.45]；夹 0.4..1.0 格。 */
        grip: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.45).clamp(-0.05, 0.45)).clamp(0.4, 1.0).round(2),
            "抓取判定", {
                unit: "格",
                description: "甩出藤蔓那一下裹住目标的横向容差；身板越宽裹面越大。侧身站得够开就可能被躲过。"
            }),
        /** 压住的攻击等级：1 + 目标物攻高（≥100）+1；密缠 +1；夹 1..3 级。 */
        atkStages: formula(
            F.base(1).plus(F.target("stat.attack").gte(100).times(F.const(1)))
                .plus(F.when(F.pref("cocoon", text("worldcombat.skill.wrap.preference.cocoon")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "压住的攻击等级", {
                unit: "级",
                description: "被裹住后下降的攻击能力等级；**物攻越高的目标掉得越多**，密缠式再补一级。对其他战斗者落到攻击力属性上。"
            }),
        /** 撕开阈值：0.26 + 物攻偏移[0,0.25]；密缠 ×1.25；夹 0.24..0.62 格/刻。 */
        tearSpeed: formula(
            F.base(0.26).plus(F.stat("attack").minus(60).times(0.005).clamp(0, 0.25))
                .times(F.when(F.pref("cocoon", text("worldcombat.skill.wrap.preference.cocoon")), F.const(1.25), F.const(1)))
                .clamp(0.24, 0.62).round(3),
            "撕开阈值", {
                unit: "格/刻",
                description: "目标被外力推到超过这个速度，藤茧就被撕开；物攻越高藤茧越紧、越难撕。被击退、冲刺都可能一脚踹开它。"
            }),
        /** 藤茧高度：1.2 + 目标身高偏移[−0.2,0.9]；夹 1.0..2.4 格。 */
        coilHeight: formula(
            F.base(1.2).plus(F.target("body.height").as("目标体型高度").minus(1.4).times(0.5).clamp(-0.2, 0.9)).clamp(1.0, 2.4).round(2),
            "藤茧高度", {
                unit: "格",
                description: "藤茧沿目标身体裹多高；目标越高大裹得越高。画面里那圈藤的高度就是它。"
            }),
        /** 藤屑数量：14 + 物攻偏移[−3,10]；夹 10..34 个。 */
        notes: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.12).clamp(-3, 10)).clamp(10, 34).round(0),
            "藤屑数量", {
                unit: "个",
                description: "藤茧收紧时掉落的叶片碎屑数量，由物攻换算；表现按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：8 − 速度偏移[−2,3]；夹 5..13 刻。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(5, 13).round(0),
            "起手", "把藤蔓甩出去裹住目标的时间；速度越快越短。"),
        /** 收招：7 − 速度偏移[−2,3]；夹 4..12 刻。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(4, 12).round(0),
            "收招", "甩完把姿态收回的时间；速度越快越短。"),
        /** 冷却：38 − 速度偏移[−5,8] − 等级(≥30)偏移[0,6] + 密缠 +10；夹 22..58 刻。 */
        recharge: seconds(
            F.base(38).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 8))
                .minus(F.level().minus(30).times(0.15).clamp(0, 6))
                .plus(F.when(F.pref("cocoon", text("worldcombat.skill.wrap.preference.cocoon")), F.const(10), F.const(0)))
                .clamp(22, 58).round(0),
            "冷却", "两次紧束之间的等待；速度与等级让它回得更快，密缠式更久。")
    });

    stages("wrap", [
        { level: 26, values: { crush: 22 } },
        { level: 42, values: { crush: 28, coilTicks: 150, atkStages: 2 } }
    ]);

    defineDamage("wrap", "crush", {}, { contact: true });

    describe("wrap", [
        { key: "description.0", values: ["crush", "reach", "grip"] },
        { key: "description.1", values: ["coilTicks", "interval", "atkStages"] },
        { key: "description.2", values: ["tearSpeed"] },
        { key: "cocoon.on", values: [], when: function (context) { return read(context.detail.values, ["cocoon"]) === true; } },
        { key: "cocoon.off", values: [], when: function (context) { return read(context.detail.values, ["cocoon"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crush"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.crush", "tier.1.coilTicks", "tier.1.atkStages"] }
    ]);
}
