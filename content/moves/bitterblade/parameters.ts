/**
 * 悔念剑 / bitterblade —— 参数与伤害段。
 *
 * 原生事实：Fire／物理／威力 90／命中 100／PP 10／接触／slicing 标记／吸取一半伤害（Cobblemon 1.8，仅苍炎刃鬼 1 位学习者）。
 *
 * 核心念头：**把对世间的留恋压进剑尖，扫出一道悔恨的弧**。它是本族唯一的斩击、也唯一随施法者自身伤势变强：
 *   失去的生命越多，这一剑越沉、抽回的越多；剑弧扫过身前一片，弧里的敌人各挨一记。
 * 翻译：一趟扇形斩击（`WorldGeometry.sector`，判定与画面同一片弧），命中结算 `slash` 物理火焰伤害并把一半经 `drain` 抽回自身。
 *
 * 与家族分开：木角是冲撞、吸取拳是直拳、吸血是持续的咬；只有悔念剑是**扇面斩击**，也是唯一把「自身残血」当燃料的一招。
 *   配置 `sweep` 让同一招在「横扫面」与「直斩线」两种形状间取舍。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   slash   斩击威力 90 + 物攻偏移 + 悔意加成；横扫式 ×0.85（分给弧内多人）。
 *   sap     汲取比例 0.50 + 物攻偏移 + 悔意加成；横扫式 ×0.87。
 *   arc     张角 100 度；横扫式 ×1.5（更宽），直斩式 ×0.5（更窄更准）。
 *   reach   剑距 3.2 + 速度偏移；横扫式 ×1.05。也是实际射程来源。
 *   blade   剑锋判定 0.45 + 身高偏移；决定弧面能扫到多高。
 *   tempo／aftercast／recharge 速度决定起手、收招与冷却；横扫式更慢。
 *   悔意 = 1 − 当前生命比例（`individual.healthRatio`）：失去的生命越多，slash 与 sap 越强，最多各 +45%／+0.12。
 *
 * 配置 `sweep`（横扫式）双向取舍：开＝更宽更远的弧、一次扫到更多人，但每个目标更轻、抽得更少、收招更慢；
 *   关＝直斩式，弧窄而深、单点更重、抽得更足、出手更快。两向各有局面（清场 vs 单点）。
 *
 * 伤害段 `slash` 与参数同名，走共享换算（原生类别 Physical，Fire 属性，接触、slicing）。
 */
namespace PokemonSkills {
    actionParameters.define("bitterblade", {
        /** 斩击威力：90 + 物攻偏移[−14,30] + 悔意加成[0,0.45]；横扫式 ×0.85；夹 60..150。 */
        slash: formula(
            F.base(90).plus(F.stat("attack").minus(65).times(0.40).clamp(-14, 30))
                .times(F.const(1).plus(F.const(1).minus(F.individual("healthRatio")).clamp(0, 1).times(0.45)))
                .times(F.when(F.pref("sweep", text("worldcombat.skill.bitterblade.preference.sweep")), F.const(0.85), F.const(1)))
                .clamp(60, 150).round(1),
            "斩击威力", {
                base: 90,
                unit: "威力",
                description: "剑锋扫过的基础威力；物攻越高越重，施法者失去的生命越多、悔意越深，这一剑越沉；横扫式把力量分给弧内多人。对手防御、相性与暴击在命中时另算。"
            }),
        /** 汲取比例：0.50 + 物攻偏移[−0.03,0.05] + 悔意加成[0,0.12]；横扫式 ×0.87；夹 0.38..0.62。 */
        sap: formula(
            F.base(0.50).plus(F.stat("attack").minus(65).times(0.0008).clamp(-0.03, 0.05))
                .plus(F.const(1).minus(F.individual("healthRatio")).clamp(0, 1).times(0.12))
                .times(F.when(F.pref("sweep", text("worldcombat.skill.bitterblade.preference.sweep")), F.const(0.87), F.const(1)))
                .clamp(0.38, 0.62),
            "汲取比例", {
                base: 0.50,
                presentation: "percent",
                format: function (value) { return String(Math.round(value * 10000) / 100) + "%"; },
                description: "斩击造成的伤害转为自身回复的比例（原生一半）；物攻高、悔意深、直斩式抽得更足。"
            }),
        /** 张角：横扫式 150 度、直斩式 50 度；夹 35..170。 */
        arc: formula(
            F.base(100).times(F.when(F.pref("sweep", text("worldcombat.skill.bitterblade.preference.sweep")), F.const(1.5), F.const(0.5)))
                .clamp(35, 170).round(0),
            "张角", {
                base: 100,
                unit: "度",
                description: "剑弧张开的角度；横扫式更宽、一次扫到更多人，直斩式更窄更准。"
            }),
        /** 剑距：3.2 + 速度偏移[−0.4,0.8]；横扫式 ×1.05；夹 2.6..4.6。 */
        reach: formula(
            F.base(3.2).plus(F.stat("speed").minus(55).times(0.014).clamp(-0.4, 0.8))
                .times(F.when(F.pref("sweep", text("worldcombat.skill.bitterblade.preference.sweep")), F.const(1.05), F.const(1)))
                .clamp(2.6, 4.6).round(2),
            "剑距", {
                base: 3.2,
                unit: "格",
                description: "从站位到剑锋够到的最远距离，也是本招的实际射程来源；腿快的个体扫得更远。"
            }),
        /** 剑锋判定：0.45 + 身高偏移[−0.05,0.20]；夹 0.36..0.70。 */
        blade: formula(
            F.base(0.45).plus(F.body("height").minus(1.3).times(0.12).clamp(-0.05, 0.20)).clamp(0.36, 0.70).round(2),
            "剑锋判定", {
                base: 0.45,
                unit: "格",
                description: "剑弧扫过的高度；个高的个体剑锋更长，弧面能扫到更高的目标。"
            }),
        /** 起手：9 − 速度偏移[−2,2] + 横扫式 2；夹 6..14。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 2))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.bitterblade.preference.sweep")), F.const(2), F.const(0)))
                .clamp(6, 14).round(0),
            "起手", "把悔意压进剑尖、抬剑蓄势的时间；速度越快越短，横扫式要多蓄一拍。"),
        /** 收招：9 − 速度偏移[−2,2] + 横扫式 3；夹 6..15。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 2))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.bitterblade.preference.sweep")), F.const(3), F.const(0)))
                .clamp(6, 15).round(0),
            "收招", "收剑、压住剑上余烬的收势；横扫式扫得更开、收得更慢。"),
        /** 冷却：40 − 速度偏移[−5,4] + 横扫式 5；夹 28..54。 */
        recharge: seconds(
            F.base(40).minus(F.stat("speed").minus(55).times(0.05).clamp(-5, 4))
                .plus(F.when(F.pref("sweep", text("worldcombat.skill.bitterblade.preference.sweep")), F.const(5), F.const(0)))
                .clamp(28, 54).round(0),
            "冷却", "两次斩击之间的等待；横扫式回得更慢。")
    });

    stages("bitterblade", [
        { level: 48, values: { slash: 100 } },
        { level: 60, values: { slash: 112, sap: 0.53 } }
    ]);

    defineDamage("bitterblade", "slash", { defenceCoefficient: 0.005,
        rationale: "悔念剑的接触斩击，防御按默认系数减伤。" }, { contact: true, slice: true });

    describe("bitterblade", [
        { key: "description.0", values: ["slash"] },
        { key: "description.1", values: ["arc","reach","blade"] },
        { key: "description.2", values: ["sap"] },
        { key: "sweep.on", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) === true; } },
        { key: "sweep.off", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slash", "tier.1.sap"] }
    ]);
}
