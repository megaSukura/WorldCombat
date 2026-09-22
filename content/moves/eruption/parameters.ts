/**
 * 喷火 / eruption 的参数与伤害段。
 *
 * 原生事实：Fire／特殊／威力 150 ×（自身 HP / 最大 HP）／命中 100／PP 5／target allAdjacentFoes，
 *   无次要效果（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「爆发怒火」落成一次**从脚下向上掀开的火山爆发**——先把火压在地面（起手），再整圈炸开：
 *   一柱火从身上冲天、一圈冲击贴着地向外推。满血时是一座山在喷，越虚弱火势越小。与同族分开：
 *   喷烟是竖柱塌成火环、地上留余烬；喷水是一道会推人的潮墙；巨龙威能是一道前向龙息。
 *   喷火是**瞬时、内向外的球形爆发**：它不看方向、不挑目标，只按离施法者的远近结算，最近的人挨得最重。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   burst       爆发威力：原生 150 乘上 HP 比例（满血最盛），特攻给出火有多烈，等级让火更经烧。
 *   blastRadius 波及半径：特攻决定火摊多开，体型高度让身子大的人罩得更宽。
 *   falloff     边缘保留：特攻越高声压越均匀、外圈衰减越少。
 *   burnChance  点燃几率：原生没有次要效果，这里由特攻与当前血量给出——满血时火最旺、最容易点着。
 *   knock       外推距离：特攻与体重共同决定冲击把圈里的人推多远。
 *   lift        上抛高度：体重决定这一爆把人抬多高。
 *   column      火柱高度：体型高度决定从身上冲起多高。
 *   chargeTicks 起手：速度决定压火压得多快。
 *   sparks      迸溅量：特攻与体重派生，同时驱动画面密度。
 *   ashTicks    余烬时长：等级决定灰烬落多久（只作画面）。
 *
 * 伤害段 `burst` 走共享换算（原始类别 Special）；灼伤经 `hurt` 的 `status: "burn"` 落到任何目标上。
 */
namespace PokemonSkills {
    actionParameters.define("eruption", {
        /** 爆发威力：150 + 特攻偏移[−20,54]，整体乘 HP 比例 0.20..1.00；夹 14..300。 */
        burst: formula(
            F.base(150).plus(F.stat("specialAttack").minus(60).times(0.42).clamp(-20, 54))
                .times(F.stat("hpRatio").scale(0.20, 1.0).as("HP 比例"))
                .clamp(14, 300).round(1),
            "爆发威力", {
                unit: "威力",
                description: "喷发在中心对每个敌人结算的基础威力；原生 150 乘当前 HP 比例，满血最盛、越虚弱越小，特攻越高火越烈。离中心越远按边缘保留系数衰减；对手特防、相性与暴击在命中时另算。"
            }),
        /** 波及半径：3.4 + 特攻偏移[−0.5,1.4] + 高度偏移[−0.3,1.1]；夹 2.6..5.8。 */
        blastRadius: formula(
            F.base(3.4).plus(F.stat("specialAttack").minus(60).times(0.018).clamp(-0.5, 1.4))
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 1.1)).clamp(2.6, 5.8).round(2),
            "波及半径", {
                unit: "格",
                description: "喷发罩住身周多大一圈；特攻高、体型大的个体炸得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 边缘保留：0.55 − 特攻偏移[−0.08,0.18]；夹 0.35..0.80。 */
        falloff: percent(
            F.base(0.55).minus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.08, 0.18)).clamp(0.35, 0.80).round(3),
            "边缘保留", "圈边的人还能吃到中心威力的多少；特攻越高火越均匀、外圈衰减越小。"),
        /** 点燃几率：0.20 + 特攻偏移[−0.06,0.14] + HP 比例 ×0.14；夹 0.08..0.55。 */
        burnChance: percent(
            F.base(0.20).plus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.06, 0.14))
                .plus(F.stat("hpRatio").times(0.14)).clamp(0.08, 0.55).round(3),
            "点燃几率", "被喷发扫到后陷入灼伤的几率；特攻越高、自身血量越满，火越旺越容易点着。"),
        /** 外推距离：0.7 + 特攻偏移[−0.2,0.6] + 体重偏移[0,0.7]；夹 0.4..1.9。 */
        knock: formula(
            F.base(0.7).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.2, 0.6))
                .plus(F.body("weight").minus(60).times(0.004).clamp(0, 0.7)).clamp(0.4, 1.9).round(2),
            "外推距离", {
                unit: "格",
                description: "冲击把圈里的人沿背离方向推多远；特攻越高、体重越大推得越远。"
            }),
        /** 上抛高度：0.3 + 体重偏移[0,0.35]；夹 0.15..0.8。 */
        lift: formula(
            F.base(0.3).plus(F.body("weight").minus(60).times(0.002).clamp(0, 0.35)).clamp(0.15, 0.8).round(2),
            "上抛高度", {
                unit: "格",
                description: "爆发把人向上抛起多高；越重的个体这一爆抬得越高，也更难马上站稳。"
            }),
        /** 火柱高度：2.2 + 高度偏移[−0.4,2.2]；夹 1.6..4.6。 */
        column: formula(
            F.base(2.2).plus(F.body("height").minus(1.4).times(1.2).clamp(-0.4, 2.2)).clamp(1.6, 4.6).round(2),
            "火柱高度", {
                unit: "格",
                description: "喷发时从身上冲起的火柱有多高；体型高的个体喷得更高，画面从这读出火势。"
            }),
        /** 起手：14 − 速度偏移[−2,4]；夹 10..18。 */
        chargeTicks: seconds(
            F.base(14).minus(F.stat("speed").minus(60).times(0.08).clamp(-2, 4)).clamp(10, 18).round(0),
            "起手", "把火压进地面要多久；速度快的个体起手更短、更早炸开。"),
        /** 迸溅量：26 + 特攻偏移[−6,16] + 体重偏移[0,22]；夹 16..64。 */
        sparks: formula(
            F.base(26).plus(F.stat("specialAttack").minus(60).times(0.1).clamp(-6, 16))
                .plus(F.body("weight").minus(60).times(0.12).clamp(0, 22)).clamp(16, 64).round(0),
            "迸溅量", {
                unit: "点",
                description: "喷发时崩出的火屑与灰量；特攻高、体重大的个体炸得更密，画面密度按它发射。"
            }),
        /** 余烬时长：18 + 等级 ×0.12；夹 14..34。 */
        ashTicks: seconds(
            F.base(18).plus(F.level().times(0.12)).clamp(14, 34).round(0),
            "余烬时长", "火退去后灰烬与余烟在地上飘多久；只作画面，不再造成伤害。")
    });

    defineDamage("eruption", "burst", {});

    stages("eruption", [
        { level: 42, values: { cooldown: 38 } },
        { level: 58, values: { cooldown: 33 } }
    ]);

    describe("eruption", [
        { key: "description.0", values: ["burst", "blastRadius"] },
        { key: "description.1", values: ["falloff", "knock", "lift"] },
        { key: "description.2", values: ["burnChance", "column", "chargeTicks"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] }
    ]);
}
