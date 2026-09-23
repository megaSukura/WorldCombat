/**
 * 重踏 / bulldoze 的参数与伤害段。
 *
 * 原生事实：Ground／物理／威力 60／命中 100／PP 20／target allAdjacent（自己周围所有宝可梦）／100% 降速度一级。
 * 翻译：把「用力踩踏地面」翻成一圈**贴着地表往外推的地裂**——它不从身上炸开，而是沿地面走；
 * 只走地面，所以站在空中的人不会被扫到。它是一招覆盖，站在圈里的都被震得脚步发沉。
 * 与同族分开（同为自身周围的扫场，介质不同）：
 *   重踏     —— 地裂贴地向外推进，只命中站在地上的目标，留下裂开的地表。
 *   放电     —— 瞬时电弧从身上同时迸出，空中地面一起打，不留痕。
 *   喷烟     —— 先向上喷起熔岩烟柱，再塌成火环，留下焦黑地表。
 *   污泥波   —— 黏稠的污泥潮从脚下慢慢漫开又退，留下污泥水洼。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   tremor       单次踏击威力 52 + 物攻偏移 + **体重偏移**（越沉砸得越实）。
 *   waveRadius   地裂半径 3.2 格 + 碰撞箱宽度偏移 + 等级偏移（个子宽、等级高的人震得更开）。
 *   waveTicks    地裂从脚下推到边缘的时间 7 刻 − 速度偏移（脚步快的人推得急）。
 *   snareStages  减速等级 1 级，深踏式 +1；等级成长也会并入。
 *   push         被震开 0.22 格 + 物攻偏移。
 *   crackTicks   裂痕停留 90 刻 + 等级。
 *   scars        裂痕块数 26 + 物攻 ×0.25（同时驱动画面密度）。
 *
 * 配置 `deep`（深踏式）：开启＝地裂收窄到 0.68 倍、单次威力 ×1.24、减速多一级、震得更远，但起手 +3 刻、冷却 +8；
 * 关闭＝震得更广（半径 ×1.12）、出手更快，适合扫一片、追快目标。两向各有适用局面。
 *
 * 伤害段 `tremor` 与参数同名，走共享换算（原始类别 Physical）。
 */
namespace PokemonSkills {
    actionParameters.define("bulldoze", {
        /** 踏击威力：52 + 物攻偏移[−12,34] + 体重偏移[−8,24]；深踏 ×1.24 / 广踏 ×0.9；夹 34..112。 */
        tremor: formula(
            F.base(52)
                .plus(F.stat("attack").minus(60).times(0.22).clamp(-12, 34))
                .plus(F.body("weight").minus(60).times(0.05).clamp(-8, 24))
                .times(F.when(F.pref("deep"), F.const(1.24), F.const(0.9)))
                .clamp(34, 112).round(1),
            "踏击威力", {
                unit: "威力",
                description: "地裂扫过时对圈内每个站在地上的敌人各结算一次的基础威力；物攻越高、身体越沉砸得越实。对手防御、相性与暴击在命中时另算。"
            }),
        /** 地裂半径：3.2 + 碰撞箱宽度偏移[−0.3,1.4] + 等级(≥25)偏移[0,1.2]；深踏 ×0.68 / 广踏 ×1.12；夹 1.8..5.4。 */
        waveRadius: formula(
            F.base(3.2)
                .plus(F.body("width").minus(0.9).times(0.9).clamp(-0.3, 1.4))
                .plus(F.level().minus(25).times(0.03).clamp(0, 1.2))
                .times(F.when(F.pref("deep"), F.const(0.68), F.const(1.12)))
                .clamp(1.8, 5.4).round(2),
            "地裂半径", {
                unit: "格",
                description: "地裂从脚下向外推进到多远；体型宽、等级高的个体震得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 推进时间：7 − 速度偏移[−1.5,2.5] + 深踏 2；夹 4..12。 */
        waveTicks: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.012).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("deep"), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "推进时间", "地裂从脚边推到最外圈要多久；脚步越快推得越急，目标越难在波到之前走开。"),
        /** 减速等级：1 级，深踏 +1；夹 1..2。 */
        snareStages: formula(
            F.base(1).plus(F.when(F.pref("deep"), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "减速等级", {
                unit: "级",
                description: "被扫到的目标速度下降几级；对宝可梦落到原生等级，对其他战斗者落到移动速度属性。"
            }),
        /** 震开距离：0.22 + 物攻偏移[−0.06,0.28]；深踏 ×1.35 / 广踏 ×0.85；夹 0.1..0.7。 */
        push: formula(
            F.base(0.22).plus(F.stat("attack").minus(60).times(0.002).clamp(-0.06, 0.28))
                .times(F.when(F.pref("deep"), F.const(1.35), F.const(0.85)))
                .clamp(0.1, 0.7).round(2),
            "向外震开", {
                unit: "格",
                description: "被地裂扫到时沿离中心的方向被震开的距离；力量越大推得越远，深踏式震得更狠。"
            }),
        /** 裂痕停留：90 + 等级 ×0.8；夹 60..180。 */
        crackTicks: seconds(
            F.base(90).plus(F.level().times(0.8)).clamp(60, 180).round(0),
            "裂痕停留", "地裂在脚边留下的裂开地表停留多久；到期原方块回来。"),
        /** 裂痕块数：26 + 物攻 ×0.25；夹 22..64。同时驱动画面密度。 */
        scars: formula(
            F.base(26).plus(F.stat("attack").times(0.25)).clamp(22, 64).round(0),
            "裂痕数量", {
                unit: "块",
                description: "地裂在地表留下的裂痕块数；随物攻增长，也决定画面的密度。"
            }),
        maxTargets: hidden(10)
    });

    defineDamage("bulldoze", "tremor", {});

    stages("bulldoze", [
        { level: 44, values: { tremor: 68, waveRadius: 3.9, snareStages: 2 } }
    ]);

    describe("bulldoze", [
        { key: "description.0", values: ["tremor","maxTargets"] },
        { key: "description.ground", values: [] },
        { key: "description.1", values: ["waveRadius", "waveTicks"] },
        { key: "description.2", values: ["snareStages","push"] },
        { key: "description.3", values: ["crackTicks","scars"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.tremor", "tier.0.waveRadius", "tier.0.snareStages"] }
    ]);
}
