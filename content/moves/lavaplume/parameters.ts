/**
 * 喷烟 / lavaplume 的参数与伤害段。
 *
 * 原生事实：Fire／特殊／威力 80／命中 100／PP 15／target allAdjacent（自己周围所有宝可梦）／30% 灼伤。
 * 翻译：把「用熊熊烈火攻击自己周围」翻成**先从身上向上喷起一道熔岩烟柱，再向外塌成一道火环**——
 * 它是唯一有竖直第一幕的同族招：起手看得见柱子升起，再把火铺出去。被烧到的可能灼伤；
 * 开浓烟式时火环退去后地上还留一层闷烧的余烬，没人管它会继续烫。
 * 与同族分开：重踏贴地、放电瞬时、污泥波慢漫，只有喷烟是先立柱再塌环的火。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   plume        火环威力 66 + 特攻偏移 + 等级偏移（火焰越旺烧得越狠）。
 *   ember        余烬每跳威力 12 + 特攻偏移（浓烟式才使用）。
 *   ringRadius   火环半径 3.2 格 + 特攻偏移 + 碰撞箱高度偏移。
 *   plumeHeight  烟柱高度 1.6 格 + 高度偏移 + 特攻偏移（只驱动画面，读出一幕的高度）。
 *   spreadTicks  火环推开的时间 6 刻 − 速度偏移。
 *   burnChance   灼伤几率 0.20 + 特攻偏移 + 等级偏移。
 *   emberTicks   余烬持续 60 + 等级偏移 + HP 偏移。
 *   emberPulse   余烬两跳之间 8 刻 − 速度偏移。
 *
 * 配置 `fume`（浓烟式）：开启＝火环 ×0.88、半径 ×0.85，但退去后留下一层闷烧余烬反复烫人，冷却 +10；
 * 关闭＝一发更重的火环、无余烬，冷却 −2。两向各有适用局面（封地 vs 爆伤）。
 *
 * 伤害段 `plume`（火环）与 `ember`（余烬）各自成段，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("lavaplume", {
        /** 火环威力：66 + 特攻偏移[−14,38] + 等级(≥25)偏移[0,10]；浓烟 ×0.88 / 爆燃 ×1.1；夹 44..140。 */
        plume: formula(
            F.base(66)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-14, 38))
                .plus(F.level().minus(25).times(0.05).clamp(0, 10))
                .times(F.when(F.pref("fume"), F.const(0.88), F.const(1.1)))
                .clamp(44, 140).round(1),
            "火环威力", {
                unit: "威力",
                description: "火环塌开时对圈内每个敌人各结算一次的基础威力；特攻越高、等级越高烧得越狠。对手特防、相性与暴击在命中时另算。"
            }),
        /** 余烬威力：12 + 特攻偏移[−4,12]；夹 6..28。 */
        ember: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-4, 12)).clamp(6, 28).round(1),
            "余烬威力", {
                unit: "威力",
                description: "浓烟式留下的余烬每跳一次对圈内每人造成的伤害；踩在还烫的地上就会再挨。"
            }),
        /** 火环半径：3.2 + 特攻偏移[−0.4,1.1] + 高度偏移[−0.3,1.0]；浓烟 ×0.85 / 爆燃 ×1.0；夹 2.2..5.4。 */
        ringRadius: formula(
            F.base(3.2)
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.4, 1.1))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .times(F.when(F.pref("fume"), F.const(0.85), F.const(1)))
                .clamp(2.2, 5.4).round(2),
            "火环半径", {
                unit: "格",
                description: "火环从身上向外铺到多远；特攻高、体型大的个体烧得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 烟柱高度：1.6 + 高度偏移[−0.3,1.2] + 特攻偏移[0,0.6]；夹 1.0..3.2。 */
        plumeHeight: formula(
            F.base(1.6)
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.01).clamp(0, 0.6))
                .clamp(1.0, 3.2).round(2),
            "烟柱高度", {
                unit: "格",
                description: "起手喷起的熔岩烟柱有多高；它决定第一幕画面的高度，也让对手读出火马上要从这里扑出来。"
            }),
        /** 推开时间：6 − 速度偏移[−1.5,2.5]；夹 4..10。 */
        spreadTicks: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.012).clamp(-1.5, 2.5)).clamp(4, 10).round(0),
            "火环推开时间", "火环从脚边铺到最外圈要多久；速度快的个体铺得越急。"),
        /** 灼伤几率：0.20 + 特攻偏移[−0.05,0.16] + 等级(≥20)偏移[0,0.08]；夹 0.10..0.46。 */
        burnChance: percent(
            F.base(0.20)
                .plus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.05, 0.16))
                .plus(F.level().minus(20).times(0.0015).clamp(0, 0.08))
                .clamp(0.10, 0.46).round(3),
            "灼伤几率", "被火环烧到的目标陷入灼伤的几率；特攻越高、等级越高越容易点着。"),
        /** 余烬持续：60 + 等级(≥25)偏移[0,24] + HP 偏移[−6,14]；夹 40..120。 */
        emberTicks: seconds(
            F.base(60)
                .plus(F.level().minus(25).times(0.8).clamp(0, 24))
                .plus(F.stat("hp").minus(60).times(0.1).clamp(-6, 14))
                .clamp(40, 120).round(0),
            "余烬持续", "浓烟式留下的余烬在地上闷烧多久；这段时间里站在圈内会反复挨烫。"),
        /** 余烬间隔：8 − 速度偏移[−1.5,2.5]；夹 5..12。 */
        emberPulse: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.012).clamp(-1.5, 2.5)).clamp(5, 12).round(0),
            "余烬间隔", "余烬两跳之间隔多久；速度快的个体烫得更密。"),
        maxTargets: hidden(8)
    });

    defineDamage("lavaplume", "plume", {});
    defineDamage("lavaplume", "ember", {});

    stages("lavaplume", [
        { level: 44, values: { plume: 86, ringRadius: 3.7, burnChance: 0.30 } }
    ]);

    describe("lavaplume", [
        { key: "description.0", values: ["plume"] },
        { key: "description.1", values: ["ringRadius", "spreadTicks"] },
        { key: "description.2", values: ["burnChance"] },
        { key: "description.3", values: ["ember", "emberTicks", "emberPulse"] },
        { key: "fume.on", values: [], when: function (context) { return read(context.detail.values, ["fume"]) === true; } },
        { key: "fume.off", values: [], when: function (context) { return read(context.detail.values, ["fume"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.plume", "tier.0.ringRadius", "tier.0.burnChance"] }
    ]);
}
