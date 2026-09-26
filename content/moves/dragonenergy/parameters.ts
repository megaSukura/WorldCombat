/**
 * 巨龙威能 / dragonenergy 的参数与伤害段。
 *
 * 原生事实：Dragon／特殊／威力 150 ×（自身 HP / 最大 HP）／命中 100／PP 5／target allAdjacentFoes／
 *   无次要效果；Regidrago 的专属招，全 Table 仅 1 位学习者（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「把生命力转换为力量」照字面落成**从自己身上抽出的龙息**——起手时一缕缕生命光沿瞄准方向从身体
 * 汇到身前的龙首，再喷成一个真正的前向 3D 锥（可向上喷向高台）；锥里的人各挨一次、被沿喷出的方向推。
 * 它是本族唯一**前向、可瞄准、越远越吃站位**的招（喷火/喷水都以自身为中心），也是唯一把「生命」直接
 * 写进代价里的一招：献祭式真的抽走自己的一部分生命来加码。威力在抽血之前按当时 HP 快照，说明与结算一致。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   bolt         龙息威力：原生 150 乘 HP 比例，特攻给出龙威的烈度，等级让它更经用；献祭式再乘一档。
 *   coneLength   锥长（射程）：特攻与等级共同决定喷得多远。
 *   coneAngle    锥角：特攻越高越收束、越集中。
 *   push         推涌距离：特攻决定龙息把人沿喷出方向带走多远。
 *   chargeTicks  起手：速度决定生命光汇得有多快。
 *   lifeDraw     献祭式抽走的生命比例：只随配置生效，是这一档加码的真正代价。
 *   focusCount   生命光条数：特攻派生，同时驱动画面密度。
 *
 * 配置 `sacrifice`（献祭式）双向取舍：开启＝龙息 ×1.3，但施放瞬间抽走最大生命的 `lifeDraw`——
 *   血低时会把后续几发一起打薄，甚至自毙；关闭（守成式）＝不出血、威力较低。两向各有适用局面。
 *
 * 伤害段 `bolt` 走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("dragonenergy", {
        /** 龙息威力：150 + 特攻偏移[−22,58] + 等级(≥30)偏移[0,16]，整体乘 HP 比例 0.18..1.00；献祭 ×1.3；夹 14..320。 */
        bolt: formula(
            F.base(150).plus(F.stat("specialAttack").minus(60).times(0.44).clamp(-22, 58))
                .plus(F.level().minus(30).times(0.4).clamp(0, 16))
                .times(F.stat("hpRatio").scale(0.18, 1.0).as("HP 比例"))
                .times(F.when(F.pref("sacrifice"), F.const(1.3), F.const(1)))
                .clamp(14, 320).round(1),
            "龙息威力", {
                unit: "威力",
                description: "龙息锥内对每个敌人结算的基础威力；原生 150 乘当前 HP 比例，特攻越高、等级越高越盛，献祭式再加码。对手特防、相性与暴击在命中时另算。"
            }),
        /** 锥长：8 + 特攻偏移[−1.5,4] + 等级(≥30)偏移[0,2.5]；夹 6..14。 */
        coneLength: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-1.5, 4))
                .plus(F.level().minus(30).times(0.06).clamp(0, 2.5)).clamp(6, 14).round(2),
            "锥长", {
                unit: "格",
                description: "龙息沿视线喷多远；特攻高、等级高的个体喷得更远。它也是本招的实际射程。"
            }),
        /** 锥角：42 − 特攻偏移[−3,5]；夹 26..60。 */
        coneAngle: formula(
            F.base(42).minus(F.stat("specialAttack").minus(60).times(0.08).clamp(-3, 5)).clamp(26, 60).round(0),
            "锥角", {
                unit: "度",
                description: "龙息锥张开多大；特攻越高越收束，打得更集中、也更要求瞄准。"
            }),
        /** 推涌距离：0.35 + 特攻偏移[−0.1,0.35]；夹 0.2..0.95。 */
        push: formula(
            F.base(0.35).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.1, 0.35)).clamp(0.2, 0.95).round(2),
            "推涌距离", {
                unit: "格",
                description: "被龙息喷中的目标沿喷出方向被带走多远；特攻越高推得越远。"
            }),
        /** 起手：16 − 速度偏移[−2,5]；夹 11..20。 */
        chargeTicks: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.1).clamp(-2, 5)).clamp(11, 20).round(0),
            "起手", "把生命光汇成龙首要多久；速度快的个体起手更短，留给对手走开的窗口更小。"),
        /** 献祭抽血：0.12 + 等级 ×0.0006；夹 0.08..0.20。 */
        lifeDraw: percent(
            F.base(0.12).plus(F.level().times(0.0006)).clamp(0.08, 0.20).round(4),
            "献祭抽血", "献祭式下施放瞬间抽走的最大生命比例；只有开启献祭式时才生效，是这一档加码的代价。"),
        /** 生命光条数：30 + 特攻偏移[−6,18]；夹 18..70。 */
        focusCount: formula(
            F.base(30).plus(F.stat("specialAttack").minus(60).times(0.15).clamp(-6, 18)).clamp(18, 70).round(0),
            "生命光条数", {
                unit: "条",
                description: "起手时从身上汇出的生命光条数；特攻越高越多，画面密度按它发射。"
            })
    });

    defineDamage("dragonenergy", "bolt", {});

    stages("dragonenergy", [
        { level: 50, values: { cooldown: 46 } },
        { level: 70, values: { cooldown: 40 } }
    ]);

    describe("dragonenergy", [
        { key: "description.0", values: ["bolt","coneLength","coneAngle"] },
        { key: "description.1", values: ["push","chargeTicks"] },
        { key: "sacrifice.on", values: ["lifeDraw"], when: function (context) { return read(context.detail.values, ["sacrifice"]) === true; } },
        { key: "sacrifice.off", values: [], when: function (context) { return read(context.detail.values, ["sacrifice"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] }
    ]);
}
