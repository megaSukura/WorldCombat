/**
 * 点到为止 / falseswipe 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 40／命中 100／PP 40／contact／单目标。伤害结算会在致命时截停在「目标剩余 1 HP」。
 * 117 位学习者。原生描述「对手的 HP 至少会留下 1 HP，如此般手下留情地攻击」。
 *
 * 翻译：把「一次留手的攻击」落成一记**极准的浅切**——刃峰贴着要害停住，明明能切开却只在皮上划出一道细缝。
 * `kind: "aim"` 朝任意方向或世界点递出一条又短又窄的刃线，只取刀路的**第一个接触**：友方身体与实墙都会先截住它，
 * 所以不会隔墙、隔人顺手划到后排。命中处闪一下近白的「收手」标记；无论这一刀多沉，目标都不会被打倒。
 * 留手由本次伤害自带的 `minimumHealth: 1` 实现：宿主在该次原生 hurt 的所有 Pre 监听者之后截断生命减量，
 * 只对这一击生效，仍沿原生吸收链，不保护目标免受其他攻击。其余（暴击、相性、防御）全部走共享结算。
 *
 * 与同族分开：手下留情是一记**横扫**（面向前方扇形、能同时留手好几个），点到为止是**单点精准的细切**——
 * 快、窄、贴地，画面上只有一道细缝，也只碰准心前的第一个目标。两者都不杀人，但一个「划一刀就过」，一个「停手压住一整排」。
 *
 * 数据分散（每项依赖不同的精灵数据，落到不同参数）：
 *   cut    切入威力：物攻定刃的沉，速度定手法的利落。
 *   reach  切距：速度定踏出的距离，也是本招的实际射程。
 *   edge   缝宽：碰撞箱宽度定这条细缝（射线半径）有多宽。
 *   depth  刀口高度：身高定刃从脚尖递出的高度；高大的个体刃口更高。
 *   hold   收手标记量：物攻换算，驱动命中处的亮点与细缝亮度。
 *   tempo／aftercast／recharge：速度定节奏。
 *
 * 配置 `full`（全力收手）双向取舍（默认关）：
 *   开（全力收手）：威力 ×1.18、切距 +0.2、收手标记更多，代价是起手 +3 刻、冷却 +6 刻——更沉但更慢。
 *   关（点到为止）：威力 ×0.82、出手更快、冷却更短——更轻更利落。
 *   两向各有局面：对着厚血目标用全力多削一点；常规交手用轻手保持节奏。
 *
 * 伤害段 `cut` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("falseswipe", {
        /** 切入威力：44 + 物攻偏移[−8,26] + 速度偏移[−4,12]；全力 ×1.18 / 轻手 ×0.82；夹 18..96。 */
        cut: formula(
            F.base(44)
                .plus(F.stat("attack").minus(60).times(0.18).clamp(-8, 26))
                .plus(F.stat("speed").minus(60).times(0.06).clamp(-4, 12))
                .times(F.when(F.pref("full", text("worldcombat.skill.falseswipe.preference.full")), F.const(1.18), F.const(0.82)))
                .clamp(18, 96).round(1),
            "切入威力", {
                base: 44, unit: "威力",
                description: "这一记浅切的基础威力；物攻越高刃越沉，速度越高手法越利落。威力只决定「还不到致命」时削掉多少，致命时会被截停在目标的 HP 至少剩 1。对手防御、相性与暴击在命中时另算。"
            }),
        /** 切距：2.2 + 速度偏移[−0.15,0.5] + 全力 0.2；夹 1.9..2.8。 */
        reach: formula(
            F.base(2.2)
                .plus(F.stat("speed").minus(60).times(0.008).clamp(-0.15, 0.5))
                .plus(F.when(F.pref("full", text("worldcombat.skill.falseswipe.preference.full")), F.const(0.2), F.const(0)))
                .clamp(1.9, 2.8).round(2),
            "切距", {
                base: 2.2, unit: "格",
                description: "踏出多远划出这一刀；速度快的个体贴得更前。它也是本招的实际射程。"
            }),
        /** 缝宽：0.34 + 宽度偏移[−0.04,0.28]；夹 0.3..0.62。 */
        edge: formula(
            F.base(0.34).plus(F.body("width").minus(0.9).times(0.28).clamp(-0.04, 0.28)).clamp(0.3, 0.62).round(2),
            "缝宽", {
                base: 0.34, unit: "格",
                description: "细刃的射线半径，也是刀路有多窄；身体越宽缝越宽，但仍是一条窄线。"
            }),
        /** 刀口高度：1.1 + 身高偏移[0,0.7]；夹 1.0..1.8。 */
        depth: formula(
            F.base(1.1).plus(F.body("height").minus(1.4).times(0.5).clamp(0, 0.7)).clamp(1.0, 1.8).round(2),
            "刀口高度", {
                base: 1.1, unit: "格",
                description: "细刃从脚尖递出的高度；高大的个体刃口更高。它是刀路的起点高度，与细缝宽度、切距一起决定这一刀从哪儿划过去。"
            }),
        /** 收手标记量：12 + 物攻 ×0.12；夹 10..30。 */
        hold: formula(
            F.base(12).plus(F.stat("attack").times(0.12)).clamp(10, 30).round(0),
            "收手标记量", {
                base: 12, unit: "点",
                description: "命中处闪出的收手亮点数量；随物攻增长，驱动表现里那道细缝的亮度。"
            }),
        /** 起手：8 − 速度偏移[−2,3] + 全力 3；夹 5..15。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("full", text("worldcombat.skill.falseswipe.preference.full")), F.const(3), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "沉肩、递刃的时间；速度越快越短，全力收手要多蓄一点。"),
        /** 收招：7 − 速度偏移[−1.5,2.5]；夹 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.025).clamp(-1.5, 2.5)).clamp(4, 12).round(0),
            "收招", "收刃归位的时间；速度快的个体更短。"),
        /** 冷却：26 − 速度偏移[−3,5] + 全力 6；夹 14..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 5))
                .plus(F.when(F.pref("full", text("worldcombat.skill.falseswipe.preference.full")), F.const(6), F.const(0)))
                .clamp(14, 40).round(0),
            "冷却", "再次递刃前的等待；全力收手更长，轻手更短。")
    });

    defineDamage("falseswipe", "cut", {}, { contact: true });

    stages("falseswipe", [
        { level: 30, values: { cut: 54, hold: 16 } }
    ]);

    describe("falseswipe", [
        { key: "description.0", values: ["cut"] },
        { key: "description.1", values: ["reach","edge","depth"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["full"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["full"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cut"] }
    ]);
}
