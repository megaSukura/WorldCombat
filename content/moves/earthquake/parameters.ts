/**
 * 地震 / earthquake 的参数与伤害段。
 *
 * 原生事实：Ground／物理／威力 100／命中 100／PP 10／target allAdjacent（自己周围所有宝可梦）／
 *   flags 带 nonsky（不命中离地的东西）、无次要效果。
 *
 * 翻译：把「引发地震」翻成**脚下整片地面同时被掀起来**——它不是一圈慢慢往外推的地裂（那是重踏），
 *   而是施法者把全身重量一次砸进地里，身周一整块地面当场隆起、沿几条裂缝崩开；站在那块地上的人被
 *   一起向上抛起并向外推开一点，空中的目标因为不沾地而安全。与同族分开：
 *     重踏   —— 一圈地裂贴着地表向外爬，只削速度、留的是面上的裂痕；
 *     地震   —— 整块地面瞬间掀起，把人向**上**抛，范围更大更重，留下放射状的深缝；
 *     放电   —— 瞬时电弧从身上四处迸开，不分空陆；
 *     爆音波 —— 纯声压，整圈同时被轰开，冲量最大、越近越重。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   tremor          掀地威力 100 + 物攻偏移 + **体重偏移**（越沉砸得越实）。
 *   fissureRadius   波及半径 4.6 格 + 碰撞箱宽度偏移 + 等级偏移（个子宽、等级高掀得更开）。
 *   launch          上抛初速 0.42 格/刻 + 物攻偏移 + 体重偏移（力量大、身体沉的人把人掀得更高）。
 *   shove           向外推开 0.35 格 + 物攻偏移。
 *   rentTicks       裂缝停留 160 刻 + 等级。
 *   rentCells       裂缝块数 24 + 物攻 ×0.3（同时驱动画面密度）。
 *   aftershockDelay 余震延迟 9 刻 − 速度偏移（脚步快的人补震得急）。
 *
 * 配置 `aftershock`（余震式）：开启＝主震 ×0.86、起手 +4 刻、冷却 +10 刻，但主震后约 `aftershockDelay`
 *   再掀一次半威力的余震，还没站稳的人会再挨一下；关闭＝主震 ×1.15、立刻结清。两向各有适用局面：
 *   余震式对付血厚站桩、一次打不死的目标，单震式对付脆皮或必须马上收手的时候。
 *
 * 伤害段 `tremor` 与参数同名，走共享换算（原始类别 Physical）。
 */
namespace PokemonSkills {
    actionParameters.define("earthquake", {
        /** 掀地威力：100 + 物攻偏移[−18,48] + 体重偏移[−10,28]；余震式 ×0.86 / 单震式 ×1.15；夹 60..190。 */
        tremor: formula(
            F.base(100)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-18, 48))
                .plus(F.body("weight").minus(60).times(0.06).clamp(-10, 28))
                .times(F.when(F.pref("aftershock"), F.const(0.86), F.const(1.15)))
                .clamp(60, 190).round(1),
            "掀地威力", {
                unit: "威力",
                description: "整块地面掀起时，对圈内每个站在地上的敌人结算一次的基础威力；物攻越高、身体越沉掀得越实。对手防御、相性与暴击在命中时另算。"
            }),
        /** 波及半径：4.6 + 宽度偏移[−0.4,1.6] + 等级(≥25)偏移[0,1.6]；余震式 ×1.0 / 单震式 ×1.1；夹 2.8..7.4。 */
        fissureRadius: formula(
            F.base(4.6)
                .plus(F.body("width").minus(0.9).times(1.1).clamp(-0.4, 1.6))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.6))
                .times(F.when(F.pref("aftershock"), F.const(1.0), F.const(1.1)))
                .clamp(2.8, 7.4).round(2),
            "波及半径", {
                unit: "格",
                description: "被掀起的地面伸到多远；体型宽、等级高的个体掀得更开。它也是本招的实际射程与指示圈半径。"
            }),
        /** 上抛初速：0.42 + 物攻偏移[−0.1,0.34] + 体重偏移[−0.04,0.1]；余震式 ×0.8 / 单震式 ×1.15；夹 0.2..0.95。 */
        launch: formula(
            F.base(0.42)
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.1, 0.34))
                .plus(F.body("weight").minus(60).times(0.001).clamp(-0.04, 0.1))
                .times(F.when(F.pref("aftershock"), F.const(0.8), F.const(1.15)))
                .clamp(0.2, 0.95).round(3),
            "上抛初速", {
                unit: "格/刻",
                description: "被掀中的人获得多少向上的初速；物攻高、身体沉的个体把人掀得更高。它决定目标离地的时长。"
            }),
        /** 向外推开：0.35 + 物攻偏移[−0.08,0.4]；夹 0.15..1.0。 */
        shove: formula(
            F.base(0.35).plus(F.stat("attack").minus(60).times(0.003).clamp(-0.08, 0.4)).clamp(0.15, 1.0).round(2),
            "向外推开", {
                unit: "格",
                description: "被掀中的人沿离中心的方向被推开的水平距离；力量越大推得越远。"
            }),
        /** 裂缝停留：160 + 等级 ×1.2；夹 100..300。 */
        rentTicks: seconds(
            F.base(160).plus(F.level().times(1.2)).clamp(100, 300).round(0),
            "裂缝停留", "地面被掀开后留在地上的深缝停留多久；到期原方块回来。"),
        /** 裂缝块数：24 + 物攻 ×0.3；夹 20..72。同时驱动画面密度。 */
        rentCells: formula(
            F.base(24).plus(F.stat("attack").times(0.3)).clamp(20, 72).round(0),
            "裂缝块数", {
                unit: "块",
                description: "地面被掀开的裂缝块数；随物攻增长，也决定画面的密度。"
            }),
        /** 余震延迟：9 − 速度偏移[−2,3]；夹 5..14。 */
        aftershockDelay: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.01).clamp(-2, 3)).clamp(5, 14).round(0),
            "余震延迟", "开启余震式时，主震之后多久再掀一次较小的余震；速度快的个体补震更急。"),
        maxTargets: hidden(10)
    });

    defineDamage("earthquake", "tremor", {});

    stages("earthquake", [
        { level: 48, values: { tremor: 132, fissureRadius: 5.4, launch: 0.62 } }
    ]);

    describe("earthquake", [
        { key: "description.0", values: ["tremor","maxTargets"] },
        { key: "description.1", values: ["fissureRadius", "launch", "shove"] },
        { key: "description.2", values: ["rentTicks","rentCells"] },
        { key: "aftershock.on", values: ["aftershockDelay"], when: function (context) { return read(context.detail.values, ["aftershock"]) === true; } },
        { key: "aftershock.off", values: [], when: function (context) { return read(context.detail.values, ["aftershock"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.tremor", "tier.0.fissureRadius", "tier.0.launch"] }
    ]);
}
