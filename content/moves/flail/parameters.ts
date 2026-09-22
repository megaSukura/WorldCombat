/**
 * 抓狂 / flail 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力随血量反比变化（HP 满时 20，越低越高，最高 200）／命中 100／PP 15／
 *   接触、单体，Showdown 按 hp*48/maxhp 分档给出 20/40/80/100/150/200（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「抓狂般乱打」落成**朝身前一个扇面连甩的一串乱拳**——血量越低，甩出的下数越多、每下也越重，
 *   残血时是一整片失控的乱打。原生的六档台阶在这里摊成连续的两条曲线（次数与单发威力都随缺失血量涨），
 *   玩家从挥出的下数与扇面密度就能读出自己还剩多少血。与同族分开：喷火／喷水／巨龙威能是满血越强的
 *   爆发，抓狂是唯一**越残越疯**的招，也是唯一的近身多段扇面。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   swipe   每下威力：物攻给出拳头的狠度，缺失血量（1 − HP 比例）把它抬起来。
 *   swings  挥击下数：缺失血量决定有多失控，速度给出甩手有多快。
 *   arc     扇面角度：体型宽度决定这一片摊多开。
 *   reach   扇面半径：体型宽高共同决定够到多远。
 *   gap     两下间隔：速度决定挥得多快。
 *   sparks  迸溅量：物攻与缺失血量派生，同时驱动画面密度。
 *   push    顶开距离：物攻决定把人从扇面里挤出去多远。
 *   recoil  拼命式每下的自损：物攻越高这一下越拼，自损越多。
 *
 * 配置 `reckless`（拼命式）双向取舍：开启＝单发威力 ×1.25、下数 ×1.35，但每一下自损最大生命的一小部分，
 *   残血时很容易把自己打空；关闭（稳住式）＝不自损、下数与单发都低。两向各有适用局面：血线安全时用拼命式
 *   打满伤害，残血时只能稳住。
 *
 * 伤害段 `swipe` 走共享换算（原始类别 Physical），接触由 `hurt` 的 `contact: true` 落定。
 */
namespace PokemonSkills {
    actionParameters.define("flail", {
        /** 每下威力：9 + 物攻偏移[−4,16] + 缺失血量 ×24；拼命 ×1.25；夹 6..52。 */
        swipe: formula(
            F.base(9)
                .plus(F.stat("attack").minus(60).times(0.09).clamp(-4, 16))
                .plus(F.const(1).minus(F.stat("hpRatio")).times(24).as("缺失血量"))
                .times(F.when(F.pref("reckless"), F.const(1.25), F.const(1)))
                .clamp(6, 52).round(1),
            "乱打威力", {
                unit: "威力",
                description: "每一记乱拳的基础威力；物攻打底，血量越少这一下越重，拼命式再加码。对手防御、相性与暴击在命中时另算。"
            }),
        /** 挥击下数：2 + 缺失血量 ×6 + 速度偏移[−0.5,1.5]；拼命 ×1.35；夹 2..9。 */
        swings: formula(
            F.base(2)
                .plus(F.const(1).minus(F.stat("hpRatio")).times(6).as("缺失血量"))
                .plus(F.stat("speed").minus(60).times(0.03).clamp(-0.5, 1.5))
                .times(F.when(F.pref("reckless"), F.const(1.35), F.const(1)))
                .clamp(2, 9).round(0),
            "乱打次数", {
                unit: "下",
                description: "一次施放甩出多少下；血量越低越失控，出手快的个体甩得更密。"
            }),
        /** 扇面角度：96 + 宽度偏移[0,34]；夹 70..150。 */
        arc: formula(
            F.base(96).plus(F.body("width").times(26).clamp(0, 34)).clamp(70, 150).round(0),
            "乱打扇角", {
                unit: "度",
                description: "乱打覆盖身前的扇面张角；身板越宽这一片摊得越开。"
            }),
        /** 扇面半径：1.7 + 宽度 ×1.0 + 高度偏移[−0.2,0.5]；夹 1.4..3.1。 */
        reach: formula(
            F.base(1.7).plus(F.body("width").times(1.0))
                .plus(F.body("height").minus(1.4).times(0.35).clamp(-0.2, 0.5)).clamp(1.4, 3.1).round(2),
            "乱打距离", {
                unit: "格",
                description: "扇面够到多远；体宽体高的个体伸手更长。它也是本招的实际射程。"
            }),
        /** 两下间隔：5 − 速度偏移[−1,2]；夹 3..7。 */
        gap: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(3, 7).round(0),
            "两下间隔", "相邻两记乱拳之间隔多久；速度快的个体甩得又急又密。"),
        /** 迸溅量：10 + 物攻偏移[−3,10] + 缺失血量 ×8；夹 7..24。 */
        sparks: formula(
            F.base(10).plus(F.stat("attack").minus(60).times(0.05).clamp(-3, 10))
                .plus(F.const(1).minus(F.stat("hpRatio")).times(8)).clamp(7, 24).round(0),
            "迸溅量", {
                unit: "点",
                description: "每一下崩出的尘屑量；物攻越高、越残越乱，画面里也就越密。"
            }),
        /** 顶开距离：0.12 + 物攻偏移[−0.04,0.24]；夹 0.06..0.42。 */
        push: formula(
            F.base(0.12).plus(F.stat("attack").minus(60).times(0.0025).clamp(-0.04, 0.24)).clamp(0.06, 0.42).round(2),
            "顶开距离", {
                unit: "格",
                description: "每一下把扇面里的人往背离方向挤开多远；拳头越重挤得越远。"
            }),
        /** 拼命式每下自损：0.024 + 物攻偏移[0,0.016]；夹 0.015..0.045。 */
        recoil: percent(
            F.base(0.024).plus(F.stat("attack").minus(60).times(0.0001).clamp(0, 0.016)).clamp(0.015, 0.045).round(4),
            "每下自损", "拼命式下每一记乱拳要自损的最大生命比例；只有开启拼命式时才生效。")
    });

    defineDamage("flail", "swipe", { defenceCoefficient: 0.005 }, { contact: true });

    stages("flail", [
        { level: 24, values: { cooldown: 22 } },
        { level: 46, values: { cooldown: 19 } }
    ]);

    describe("flail", [
        { key: "description.0", values: ["swipe", "swings"] },
        { key: "description.1", values: ["reach", "arc", "gap"] },
        { key: "reckless.on", values: ["recoil"], when: function (context) { return read(context.detail.values, ["reckless"]) === true; } },
        { key: "reckless.off", values: [], when: function (context) { return read(context.detail.values, ["reckless"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] }
    ]);
}
