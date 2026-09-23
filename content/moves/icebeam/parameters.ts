/**
 * 冰冻光束 / icebeam 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Ice／特殊／威力 90／命中 100／PP 10／单体；10%% 概率使目标冰冻。
 *
 * 世界化：把「向对手发射冰冻光束」落成一束**笔直、瞬间贯穿的光**——它不飞、等不了，沿着瞄准线
 *   整条烧过去；被穿过的每个人各挨一次冻伤并可能被冻住，光束尽头的地表留下一道会滑的冰。
 *   它是全家最精准、最像一个「光束」的一招：射程长、判定窄、穿透一条线，站到线外就安全。
 *
 * 与同族分开：
 *   冰冻光束 —— 瞬发贯穿一条直线的窄光束，并冻出一道冰线。
 *   冷冻干燥 —— 一颗有飞行时间、可被掩体挡下的冰晶，对水属性翻倍（另一单元）。
 *   细雪     —— 近身一片扇形乱雪、便宜可连放（同组）。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   beam         光束威力 82 + 特攻偏移 + 等级偏移，聚焦式 ×1.12。
 *   pierce       穿透目标数：扩散式 3 + 特攻偏移，聚焦式固定 2。
 *   beamLength   光束长度 13 + 等级偏移 + 特攻偏移，聚焦 ×0.92；驱动实际射程与指示半径。
 *   beamWidth    光束半宽 0.7 + 碰撞箱高度偏移 + 特攻偏移，聚焦 ×0.8（这是判定与画面同一组宽度）。
 *   linger       光束停留 16 刻 − 速度偏移（快个体喷得更急），聚焦 +4；也是画面的存活。
 *   freezeChance 冰冻概率 10%% + 特攻偏移 + 等级偏移，聚焦 ×1.25。
 *   frostTicks   冰线停留 100 + 等级 ×0.7；到期原方块回来。
 *   rimeCells    冰线块数 18 + 特攻 ×0.2（同时驱动画面霜层密度）。
 *   tempo/aftermath/wait 速度决定起手、收招与冷却，聚焦式整体更沉。
 *
 * 配置 focus（聚焦式）双向取舍：开启＝更窄更短、单体威力与冰冻概率更高、穿透更少、起手与冷却更久；
 *   关闭＝扩散式，更宽更远、可穿更多人，但每人吃得轻。两个方向各有适用局面（点名 vs 扫线）。
 *
 * 伤害段 beam：命中那一下随精灵数据变化的那部分，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("icebeam", {
        /** 光束威力：82 + 特攻偏移[−14,48] + 等级(≥30)偏移[0,10]，聚焦 ×1.12 / 扩散 ×0.94；夹 46..150。 */
        beam: formula(
            F.base(82)
                .plus(F.stat("specialAttack").minus(60).times(0.40).clamp(-14, 48))
                .plus(F.level().minus(30).times(0.25).clamp(0, 10))
                .times(F.when(F.pref("focus"), F.const(1.12), F.const(0.94)))
                .clamp(46, 150).round(1),
            "光束威力", {
                unit: "威力",
                description: "被光束烧到一次的基础威力；特攻越强、等级越高冻得越狠，聚焦式更集中。对手特防、相性与暴击在命中时另算。"
            }),
        /** 穿透目标数：扩散式 3 + 特攻偏移[0,2]，聚焦式固定 2；夹 1..6。 */
        pierce: formula(
            F.when(F.pref("focus"), F.base(2), F.base(3).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 2)))
                .clamp(1, 6).round(0),
            "穿透目标数", {
                base: 3, unit: "个",
                description: "这一束光最多能穿过几个敌人；扩散式人多穿得多，聚焦式只点名最前面的两个。"
            }),
        /** 光束长度：13 + 等级(≥30)偏移[0,3] + 特攻偏移[−1.5,3]，聚焦 ×0.92 / 扩散 ×1.05；夹 10..18。 */
        beamLength: formula(
            F.base(13)
                .plus(F.level().minus(30).times(0.05).clamp(0, 3))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1.5, 3))
                .times(F.when(F.pref("focus"), F.const(0.92), F.const(1.05)))
                .clamp(10, 18).round(2),
            "光束长度", {
                base: 13, unit: "格",
                description: "光束能烧到多远；特攻与等级越高够得越远。它也是本招的实际射程与画面里那条光束的长度。"
            }),
        /** 光束半宽：0.7 + 碰撞箱高度偏移[−0.1,0.35] + 特攻偏移[−0.1,0.25]，聚焦 ×0.8 / 扩散 ×1.2；夹 0.45..1.3。 */
        beamWidth: formula(
            F.base(0.7)
                .plus(F.body("height").minus(1.4).times(0.12).clamp(-0.1, 0.35))
                .plus(F.stat("specialAttack").minus(60).times(0.003).clamp(-0.1, 0.25))
                .times(F.when(F.pref("focus"), F.const(0.8), F.const(1.2)))
                .clamp(0.45, 1.3).round(2),
            "光束半宽", {
                base: 0.7, unit: "格",
                description: "光束有多粗，也是判定与画面里同一条线的宽度；个子高、特攻足更粗，聚焦式收细。"
            }),
        /** 光束停留：16 − 速度偏移[−3,5]，聚焦 +4；夹 8..24。 */
        linger: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.08).clamp(-3, 5))
                .plus(F.when(F.pref("focus"), F.const(4), F.const(0)))
                .clamp(8, 24).round(0),
            "光束停留", "这一束光在场上亮多久；快个体喷得更急，聚焦式多持续几刻。也是画面里光束的存活时间。"),
        /** 冰冻概率：10%% + 特攻偏移[0,12%%] + 等级偏移[0,6%%]，聚焦 ×1.25；夹 6%%..34%%。 */
        freezeChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0008).clamp(0, 0.12))
                .plus(F.level().minus(30).times(0.001).clamp(0, 0.06))
                .times(F.when(F.pref("focus"), F.const(1.25), F.const(1)))
                .clamp(0.06, 0.34).round(3),
            "冰冻概率", "被光束烧到后有这个概率陷入冰冻；特攻与等级越高越冷，聚焦式更彻底。"),
        /** 冰线停留：100 + 等级 ×0.7；夹 60..200。 */
        frostTicks: seconds(
            F.base(100).plus(F.level().times(0.7)).clamp(60, 200).round(0),
            "冰线停留", "光束在地面冻出的那条冰线停留多久；到期原方块回来。"),
        /** 冰线块数：18 + 特攻 ×0.2；夹 14..60。同时驱动画面霜层密度。 */
        rimeCells: formula(
            F.base(18).plus(F.stat("specialAttack").times(0.2)).clamp(14, 60).round(0),
            "冰线块数", {
                base: 18, unit: "块",
                description: "光束沿地面冻出多少格冰；随特攻增长，也决定画面里冰线的密度。"
            }),
        /** 起手：10 − 速度偏移[−3,4]，聚焦 +3；夹 6..15。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 4))
                .plus(F.when(F.pref("focus"), F.const(3), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "把冷气压成一束光需要多久；速度越快起手越短，聚焦式多蓄几刻。"),
        /** 收招：8 − 速度偏移[−1.5,3]；夹 5..12。 */
        aftermath: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 3)).clamp(5, 12).round(0),
            "收招", "射出之后的收势；快个体更快收回姿势。"),
        /** 冷却：44 − 速度偏移[−6,10]，聚焦 +6；夹 28..64。 */
        wait: seconds(
            F.base(44).minus(F.stat("speed").minus(60).times(0.06).clamp(-6, 10))
                .plus(F.when(F.pref("focus"), F.const(6), F.const(0)))
                .clamp(28, 64).round(0),
            "冷却", "两次发束之间的等待；速度越快回得越快，聚焦式缓得更久。")
    });

    defineDamage("icebeam", "beam", {});

    stages("icebeam", [
        { level: 38, values: { beam: 100 } },
        { level: 55, values: { beam: 112, beamLength: 16 } }
    ]);

    describe("icebeam", [
        { key: "description.0", values: ["beam","linger"] },
        { key: "description.1", values: ["beamLength","beamWidth","pierce"] },
        { key: "description.2", values: ["freezeChance"] },
        { key: "description.rime", values: ["frostTicks","rimeCells"] },
        { key: "description.3", values: ["tempo", "aftermath", "wait"] },
        { key: "focus.on", values: [], when: function (context) { return read(context.detail.values, ["focus"]) === true; } },
        { key: "focus.off", values: [], when: function (context) { return read(context.detail.values, ["focus"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.beam"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.beam", "tier.1.beamLength"] }
    ]);
}
