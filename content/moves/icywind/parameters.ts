/**
 * 冰冻之风 / icywind 的参数与伤害段。
 *
 * 原生事实：Ice／特殊／威力 55／命中 95／PP 15／target allAdjacentFoes／100% 降速度一级。
 *
 * 翻译：把「吹出结冰的冷气」翻成一堵**会走的冷气锋**——它不从身上炸开，而是从嘴边起、贴着地面
 * 向前推出去，扫过一整条走廊，把沿途的人都冻得发僵（速度下降），并在走过的地方留下一层白霜。
 * 它是本组唯一「范围自己在移动」的招，站位读得出来：锋面在哪，哪就挨冻。
 * 与同族分开：
 *   冰冻之风 —— 冷气锋向前推移，命中走廊里所有人，地面留下一路白霜。
 *   电网     —— 电织成的网抛到一点后展开留驻，踏进去才触电。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   frost        单次冻伤威力 42 + 特攻偏移 + 等级偏移（冷气越足吹得越疼）。
 *   reach        锋面推进距离 6.0 + 速度偏移 + 身高偏移（吐得急、个子高的吹得更远）。
 *   halfWidth    走廊半宽 1.5 + 碰撞箱宽度偏移 + 特攻偏移（身宽、气足的风扇得更开）。
 *   travelTicks  锋面推出时间 9 刻 − 速度偏移（脚步快的人推得急）。
 *   slowStages   减速等级 1 级；深寒式 +1。
 *   frostTicks   白霜停留 120 刻 + 等级偏移（等级高冻得更久）。
 *   frostCells   白霜块数 24 + 特攻 ×0.25（同时驱动画面密度）。
 *   tempo        起手 10 刻 − 速度偏移（速度越快越早吐）。
 *
 * 配置 `deepfreeze`（深寒式）：开启＝锋面收短到 0.78 倍、单次 ×1.2、减速多一级、白霜留得更久，
 * 但起手 +2 刻、冷却 +6；关闭＝吹得更远更广、威力略低，适合扫一片。两向各有适用局面。
 *
 * 伤害段 `frost` 与参数同名，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("icywind", {
        /** 冻伤威力：42 + 特攻偏移[−10,26] + 等级(≥25)偏移[0,10]；深寒 ×1.2 / 广域 ×0.95；夹 26..92。 */
        frost: formula(
            F.base(42)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-10, 26))
                .plus(F.level().minus(25).times(0.25).clamp(0, 10))
                .times(F.when(F.pref("deepfreeze"), F.const(1.2), F.const(0.95)))
                .clamp(26, 92).round(1),
            "冻伤威力", {
                base: 42, unit: "威力",
                description: "冷气锋扫过时对走廊里每个敌人各结算一次的基础威力；特攻与等级越高冻得越疼。对手特防、相性与暴击在命中时另算。"
            }),
        /** 推进距离：6.0 + 速度偏移[−0.7,1.8] + 身高偏移[−0.4,1.2]；深寒 ×0.78；夹 4.0..9.0。 */
        reach: formula(
            F.base(6.0)
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-0.7, 1.8))
                .plus(F.body("height").minus(1.4).times(0.7).clamp(-0.4, 1.2))
                .times(F.when(F.pref("deepfreeze"), F.const(0.78), F.const(1)))
                .clamp(4.0, 9.0).round(2),
            "推进距离", {
                base: 6.0, unit: "格",
                description: "冷气锋从嘴边向前推到多远；速度越快、身量越高吹得越远。它也是本招的实际射程与指示半径。"
            }),
        /** 走廊半宽：1.5 + 宽度偏移[−0.3,1.6] + 特攻偏移[−0.2,0.5]；夹 1.1..3.2。 */
        halfWidth: formula(
            F.base(1.5)
                .plus(F.body("width").minus(0.9).times(1.2).clamp(-0.3, 1.6))
                .plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.2, 0.5))
                .clamp(1.1, 3.2).round(2),
            "走廊半宽", {
                base: 1.5, unit: "格",
                description: "冷气锋横向张开到多宽；体型越宽、气越足扇得越开，也决定画面里那条走廊的宽度。"
            }),
        /** 推进时间：9 − 速度偏移[−1.5,2.5]；夹 4..12。 */
        travelTicks: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5)).clamp(4, 12).round(0),
            "推进时间", "冷气锋从脚边推到最远端要多久；脚步快的人推得越急，目标越难在锋到之前走开。"),
        /** 减速等级：1 级，深寒 +1；夹 1..2。 */
        slowStages: formula(
            F.base(1).plus(F.when(F.pref("deepfreeze"), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "减速等级", {
                base: 1, unit: "级",
                description: "被冻到的目标速度下降几级；对宝可梦落到原生速度等级，对其他战斗者落到移动速度属性。"
            }),
        /** 白霜停留：120 + 等级 ×0.8；深寒 ×1.3；夹 60..260。 */
        frostTicks: seconds(
            F.base(120).plus(F.level().times(0.8))
                .times(F.when(F.pref("deepfreeze"), F.const(1.3), F.const(1)))
                .clamp(60, 260).round(0),
            "白霜停留", "冷气锋在走过的地方留下的白霜停留多久；到期原方块回来。"),
        /** 白霜块数：24 + 特攻 ×0.25；夹 20..70。同时驱动画面密度。 */
        frostCells: formula(
            F.base(24).plus(F.stat("specialAttack").times(0.25)).clamp(20, 70).round(0),
            "白霜数量", {
                base: 24, unit: "块",
                description: "冷气锋在地面留下的白霜块数；随特攻增长，也决定画面里霜层的密度。"
            }),
        /** 起手：10 − 速度偏移[−1.5,2.0] + 深寒 2；夹 6..15。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2.0))
                .plus(F.when(F.pref("deepfreeze"), F.const(2), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "把冷气吸到嘴边再吐出的时间；速度越快起手越短。"),
        maxTargets: hidden(8)
    });

    defineDamage("icywind", "frost", {});

    stages("icywind", [
        { level: 44, values: { frost: 58, reach: 7.0 } }
    ]);

    describe("icywind", [
        { key: "description.0", values: ["frost"] },
        { key: "description.1", values: ["reach", "halfWidth", "travelTicks"] },
        { key: "description.2", values: ["slowStages"] },
        { key: "description.3", values: ["frostTicks", "frostCells"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["deepfreeze"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["deepfreeze"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.frost", "tier.0.reach"] }
    ]);
}
