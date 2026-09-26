/**
 * 喷烟 / lavaplume 的参数与伤害段。
 *
 * 原生事实：Fire／特殊／威力 80／命中 100／PP 15／target allAdjacent（自己周围所有宝可梦）／30% 灼伤。
 * 翻译：把「用熊熊烈火攻击自己周围」翻成**从身体竖起一柱高热烟流**——底窄、上端略散，自下而上扫过，
 * 威胁上方与贴身空间；被烧到的可能灼伤。开浓烟式时余热留在同一根柱内反复烫人，爆燃式一发即收。
 * 与同族分开：重踏是贴地向前推的地裂、放电是逐目标连线的瞬时电弧、污泥波是近身一次三维泼洒，
 * 只有喷烟是向上竖喷的柱，能打到高处。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   plume        烟柱主伤威力 66 + 特攻偏移 + 等级偏移（火焰越旺烧得越狠）。
 *   ember        柱内余热每跳威力 12 + 特攻偏移（浓烟式才使用）。
 *   ringRadius   烟柱半径 3.2 格 + 特攻偏移 + 碰撞箱高度偏移（上端散开后的横向范围）。
 *   plumeHeight  烟柱高度 1.6 格 + 高度偏移 + 特攻偏移（真实决定竖直体积）。
 *   spreadTicks  烟柱升起的时间 6 刻 − 速度偏移。
 *   burnChance   灼伤几率 0.20 + 特攻偏移 + 等级偏移。
 *   emberTicks   余热持续 60 + 等级偏移 + HP 偏移。
 *   emberPulse   余热两跳之间 8 刻 − 速度偏移。
 *
 * 配置 `fume`（浓烟式）：开启＝烟柱 ×0.88、半径 ×0.85，但同一根柱内留下余热反复烫人，冷却 +10；
 * 关闭＝一发更重的烟柱、无余热，冷却 −2。两向各有适用局面（封住正上方 vs 爆伤）。
 *
 * 伤害段 `plume`（烟柱主伤）与 `ember`（柱内余热）各自成段，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("lavaplume", {
        /** 烟柱威力：66 + 特攻偏移[−14,38] + 等级(≥25)偏移[0,10]；浓烟 ×0.88 / 爆燃 ×1.1；夹 44..140。 */
        plume: formula(
            F.base(66)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-14, 38))
                .plus(F.level().minus(25).times(0.05).clamp(0, 10))
                .times(F.when(F.pref("fume"), F.const(0.88), F.const(1.1)))
                .clamp(44, 140).round(1),
            "烟柱威力", {
                unit: "威力",
                description: "烟柱自下而上扫过时对柱内每个敌人各结算一次的基础威力；特攻越高、等级越高烧得越狠。对手特防、相性与暴击在命中时另算。"
            }),
        /** 余热威力：12 + 特攻偏移[−4,12]；夹 6..28。 */
        ember: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-4, 12)).clamp(6, 28).round(1),
            "余热威力", {
                unit: "威力",
                description: "浓烟式留在同一根柱内的余热每跳一次对柱内每人造成的伤害；还站在柱里就会再挨。"
            }),
        /** 烟柱半径：3.2 + 特攻偏移[−0.4,1.1] + 高度偏移[−0.3,1.0]；浓烟 ×0.85 / 爆燃 ×1.0；夹 2.2..5.4。 */
        ringRadius: formula(
            F.base(3.2)
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.4, 1.1))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .times(F.when(F.pref("fume"), F.const(0.85), F.const(1)))
                .clamp(2.2, 5.4).round(2),
            "烟柱半径", {
                unit: "格",
                description: "烟柱上端散开后的横向范围；特攻高、体型大的个体烧得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 烟柱高度：1.6 + 高度偏移[−0.3,1.2] + 特攻偏移[0,0.6]；夹 1.0..3.2。 */
        plumeHeight: formula(
            F.base(1.6)
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.01).clamp(0, 0.6))
                .clamp(1.0, 3.2).round(2),
            "烟柱高度", {
                unit: "格",
                description: "烟柱能升到身体中心以上多高；它真实决定竖直体积，顶棚会把它截断在下面，对手也能从柱子高度读出威胁范围。"
            }),
        /** 升起时间：6 − 速度偏移[−1.5,2.5]；夹 4..10。 */
        spreadTicks: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.012).clamp(-1.5, 2.5)).clamp(4, 10).round(0),
            "烟柱升起时间", "烟柱从脚边升到最上层要多久；速度快的个体升得越急，目标越难在柱到之前走开。"),
        /** 灼伤几率：0.20 + 特攻偏移[−0.05,0.16] + 等级(≥20)偏移[0,0.08]；夹 0.10..0.46。 */
        burnChance: percent(
            F.base(0.20)
                .plus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.05, 0.16))
                .plus(F.level().minus(20).times(0.0015).clamp(0, 0.08))
                .clamp(0.10, 0.46).round(3),
            "灼伤几率", "被火环烧到的目标陷入灼伤的几率；特攻越高、等级越高越容易点着。"),
        /** 余热持续：60 + 等级(≥25)偏移[0,24] + HP 偏移[−6,14]；夹 40..120。 */
        emberTicks: seconds(
            F.base(60)
                .plus(F.level().minus(25).times(0.8).clamp(0, 24))
                .plus(F.stat("hp").minus(60).times(0.1).clamp(-6, 14))
                .clamp(40, 120).round(0),
            "余热持续", "浓烟式留在柱内的余热继续多久；这段时间里还站在柱内会反复挨烫。"),
        /** 余热间隔：8 − 速度偏移[−1.5,2.5]；夹 5..12。 */
        emberPulse: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.012).clamp(-1.5, 2.5)).clamp(5, 12).round(0),
            "余热间隔", "柱内余热两跳之间隔多久；速度快的个体烫得更密。"),
        maxTargets: hidden(8)
    });

    defineDamage("lavaplume", "plume", {});
    defineDamage("lavaplume", "ember", {});

    stages("lavaplume", [
        { level: 44, values: { plume: 86, ringRadius: 3.7, burnChance: 0.30 } }
    ]);

    describe("lavaplume", [
        { key: "description.0", values: ["plume","maxTargets"] },
        { key: "description.1", values: ["ringRadius","plumeHeight","spreadTicks"] },
        { key: "description.2", values: ["burnChance"] },
        { key: "description.3", values: ["ember", "emberTicks", "emberPulse"] },
        { key: "fume.on", values: [], when: function (context) { return read(context.detail.values, ["fume"]) === true; } },
        { key: "fume.off", values: [], when: function (context) { return read(context.detail.values, ["fume"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.plume", "tier.0.ringRadius", "tier.0.burnChance"] }
    ]);
}
