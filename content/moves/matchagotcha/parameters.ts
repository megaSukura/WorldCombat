/**
 * 刷刷茶炮 / matchagotcha —— 参数与伤害段。
 *
 * 原生事实：Grass／特殊／威力 80／命中 90／PP 15／吸取一半伤害／20% 灼伤／thawsTarget（命中解冻）／
 *   target allAdjacentFoes（命中弹着点周围全体敌人）（Cobblemon 1.8，仅来悲粗茶 1 位学习者）。
 *
 * 核心念头：**端出一盏打好的茶，泼成一炮**。茶汤带热气，泼到的地方一片都被烫，沾上的人还可能被灼伤；
 *   热茶同时把冻住的目标化开。它是本族唯一的远程炮击、也是唯一带灼伤的一口，一次能泼到弹着点周围一片。
 * 翻译：向目标抛出一颗茶泡，落点按 `burst` 半径炸开一片；圈内每个敌人各结算一次 `brew` 特殊伤害，
 *   伤害的一部分经 `drain` 抽回自身，并按 `scald` 概率挂上共享灼伤（宝可梦同步为原生灼伤），命中即解冻。
 *
 * 与家族分开：超级吸取先抛孢荚再分拍抽、终极吸取原地立根、吸取拳/木角是近身；只有刷刷茶炮是**远程溅射炮**，
 *   也是唯一留下灼伤的一招。配置 `whisk` 让它在「点茶聚焦一束」与「刷泡泼开一片」之间取舍。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   brew    茶炮威力 80 + 特攻偏移；刷泡式 ×0.72（分给泼到的一片）。
 *   sap     汲取比例 0.50 + 特攻偏移；刷泡式 ×0.85。
 *   jet     射程 8.0 + 速度偏移；刷泡式 ×0.72（泼得更近）。也是实际射程来源。
 *   burst   溅射半径 1.4 + 身高偏移；刷泡式 ×1.35（泼得更开）。
 *   scald   灼伤概率 0.20 + 特攻偏移；刷泡式 ×1.25（泼得更散、沾得更广）。
 *   brewtime 灼伤持续 140 刻 + 特攻偏移；滚烫的茶汤能烫更久。
 *   tempo／aftercast／recharge 速度决定起手、收招与冷却；刷泡式要多搅一拍。
 *
 * 配置 `whisk`（刷泡式）双向取舍：开＝一次泼到周围一片、溅射更宽、灼伤概率更高，但每目标更轻、抽得更少、射程更近；
 *   关＝点茶式，一束聚焦、单点更重、抽得更足、射得更远。两向各有局面（群伤挂灼伤 vs 远程续航）。
 *
 * 伤害段 `brew` 与参数同名，走共享换算（原生类别 Special，Grass 属性）。
 */
namespace PokemonSkills {
    actionParameters.define("matchagotcha", {
        /** 茶炮威力：80 + 特攻偏移[−10,24]；刷泡式 ×0.72；夹 48..124。 */
        brew: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).times(0.32).clamp(-10, 24))
                .times(F.when(F.pref("whisk", text("worldcombat.skill.matchagotcha.preference.whisk")), F.const(0.72), F.const(1)))
                .clamp(48, 124).round(1),
            "茶炮威力", {
                base: 80,
                unit: "威力",
                description: "这一炮落在目标身上的基础威力；特攻越高越烫，刷泡式把力量分给泼到的一片。对手防御、相性与暴击在命中时另算。"
            }),
        /** 汲取比例：0.50 + 特攻偏移[−0.02,0.05]；刷泡式 ×0.85；夹 0.40..0.60。 */
        sap: formula(
            F.base(0.50).plus(F.stat("specialAttack").minus(60).times(0.0006).clamp(-0.02, 0.05))
                .times(F.when(F.pref("whisk", text("worldcombat.skill.matchagotcha.preference.whisk")), F.const(0.85), F.const(1)))
                .clamp(0.40, 0.60),
            "汲取比例", {
                base: 0.50,
                presentation: "percent",
                format: function (value) { return String(Math.round(value * 10000) / 100) + "%"; },
                description: "泼中的伤害转为自身回复的比例（原生一半）；特攻高抽得更足，刷泡式每目标分走的更薄。"
            }),
        /** 射程：8.0 + 速度偏移[−0.8,1.2]；刷泡式 ×0.72；夹 4.5..12。 */
        jet: formula(
            F.base(8.0).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.2))
                .times(F.when(F.pref("whisk", text("worldcombat.skill.matchagotcha.preference.whisk")), F.const(0.72), F.const(1)))
                .clamp(4.5, 12).round(2),
            "射程", {
                base: 8.0,
                unit: "格",
                description: "茶泡从泼出到够到目标的最远距离，也是本招的实际射程来源；腿快的个体端得更远，刷泡式泼得更近。"
            }),
        /** 溅射半径：1.4 + 身高偏移[−0.2,0.6]；刷泡式 ×1.35；夹 1.0..2.8。 */
        burst: formula(
            F.base(1.4).plus(F.body("height").minus(1.3).times(0.6).clamp(-0.2, 0.6))
                .times(F.when(F.pref("whisk", text("worldcombat.skill.matchagotcha.preference.whisk")), F.const(1.35), F.const(1)))
                .clamp(1.0, 2.8).round(2),
            "溅射半径", {
                base: 1.4,
                unit: "格",
                description: "茶汤落地炸开的半径，圈内每个敌人各挨一记；个高的个体泼得更开，刷泡式更宽。"
            }),
        /** 灼伤概率：0.20 + 特攻偏移[−0.04,0.12]；刷泡式 ×1.25；夹 0.10..0.42。 */
        scald: formula(
            F.base(0.20).plus(F.stat("specialAttack").minus(60).times(0.0008).clamp(-0.04, 0.12))
                .times(F.when(F.pref("whisk", text("worldcombat.skill.matchagotcha.preference.whisk")), F.const(1.25), F.const(1)))
                .clamp(0.10, 0.42),
            "灼伤概率", {
                base: 0.20,
                presentation: "percent",
                format: function (value) { return String(Math.round(value * 10000) / 100) + "%"; },
                description: "被泼到的目标陷入灼伤的概率（宝可梦同步为原生灼伤）；特攻越高、刷泡式溅得越散，越容易沾上。"
            }),
        /** 灼伤持续：140 + 特攻偏移[−30,60]；夹 90..220 刻。 */
        brewtime: seconds(
            F.base(140).plus(F.stat("specialAttack").minus(60).times(1.2).clamp(-30, 60)).clamp(90, 220).round(0),
            "灼伤持续", "茶汤够烫时灼伤能持续多久；特攻越高烫得越久。"),
        /** 起手：10 − 速度偏移[−2,2] + 刷泡式 3；夹 6..16。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 2))
                .plus(F.when(F.pref("whisk", text("worldcombat.skill.matchagotcha.preference.whisk")), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "点茶、搅出茶泡的时间；速度越快越短，刷泡式要多搅一拍。"),
        /** 收招：10 − 速度偏移[−2,2] + 刷泡式 2；夹 6..15。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 2))
                .plus(F.when(F.pref("whisk", text("worldcombat.skill.matchagotcha.preference.whisk")), F.const(2), F.const(0)))
                .clamp(6, 15).round(0),
            "收招", "收盏、压下茶汽的收势；刷泡式收得稍慢。"),
        /** 冷却：34 − 速度偏移[−4,4] + 刷泡式 4；夹 24..46。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 4))
                .plus(F.when(F.pref("whisk", text("worldcombat.skill.matchagotcha.preference.whisk")), F.const(4), F.const(0)))
                .clamp(24, 46).round(0),
            "冷却", "两炮之间的等待；刷泡式回得更慢。")
    });

    stages("matchagotcha", [
        { level: 40, values: { brew: 90 } },
        { level: 52, values: { brew: 100, scald: 0.24 } }
    ]);

    defineDamage("matchagotcha", "brew", { defenceCoefficient: 0.005,
        rationale: "茶炮的滚烫泼溅，防御按默认系数减伤。" }, {});

    describe("matchagotcha", [
        { key: "description.0", values: ["brew"] },
        { key: "description.1", values: ["jet","burst"] },
        { key: "description.2", values: ["sap"] },
        { key: "description.3", values: ["scald", "brewtime"] },
        { key: "whisk.on", values: [], when: function (context) { return read(context.detail.values, ["whisk"]) === true; } },
        { key: "whisk.off", values: [], when: function (context) { return read(context.detail.values, ["whisk"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.brew"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.brew", "tier.1.scald"] }
    ]);
}
