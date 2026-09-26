/**
 * 重踏 / bulldoze 的参数与伤害段。
 *
 * 原生事实：Ground／物理／威力 60／命中 100／PP 20／target allAdjacent（自己周围所有宝可梦）／100% 降速度一级。
 * 翻译：把「用力踩踏地面」翻成一圈**贴着地表往外推的地裂**——它不从身上炸开，而是沿地面走；
 * 只走地面，所以站在空中的人不会被扫到。它是一招覆盖，站在圈里的都被震得脚步发沉。
 * 与同族分开（同为自身周围的扫场，介质不同）：
 *   重踏     —— 地裂贴地向外推进，只命中站在地上的目标，波前扬起一道薄裂缝，不留长期改动。
 *   放电     —— 瞬时电弧从身上同时迸出，空中地面一起打，逐目标连线。
 *   喷烟     —— 从身体竖喷一柱高热烟流，威胁上方与贴身空间。
 *   污泥波   —— 近身一次泼出三维短厚泥幕，接触即散，不留持续场。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   tremor       单次踏击威力 52 + 物攻偏移 + **体重偏移**（越沉砸得越实）。
 *   waveRadius   地裂半径 3.2 格 + 碰撞箱宽度偏移 + 等级偏移（个子宽、等级高的人震得更开）。
 *   waveTicks    地裂从脚下推到边缘的时间 7 刻 − 速度偏移（脚步快的人推得急）。
 *   snareStages  减速等级 1 级，深踏式 +1；等级成长也会并入。
 *   push         被震开 0.22 格 + 物攻偏移。
 *   crackTicks   波前余痕停留 30 刻 + 等级（只驱动画面，不改动地面方块）。
 *   scars        波前裂缝密度 22 + 物攻 ×0.2（同时驱动画面密度）。
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
        /** 余痕停留：30 + 等级 ×0.3；夹 24..60。只驱动画面。 */
        crackTicks: seconds(
            F.base(30).plus(F.level().times(0.3)).clamp(24, 60).round(0),
            "余痕停留", "地裂推过后，波前扬起的裂缝与碎屑停留多久；只驱动画面，不改变地面方块。"),
        /** 裂缝密度：22 + 物攻 ×0.2；夹 16..48。同时驱动画面密度。 */
        scars: formula(
            F.base(22).plus(F.stat("attack").times(0.2)).clamp(16, 48).round(0),
            "裂缝密度", {
                description: "沿地裂波前显示的裂缝与碎屑密度；随物攻增长，也决定画面的密度。"
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
        { key: "description.3", values: [] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.tremor", "tier.0.waveRadius", "tier.0.snareStages"] }
    ]);
}
