/**
 * 暴风雪 / blizzard 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Ice／特殊／威力 110／命中 70（雪／冰雹天必中）／PP 5／target allAdjacentFoes／
 *   风类；10%% 概率使目标冰冻。
 *
 * 世界化：把「将猛烈的暴风雪刮向对手」落成一片**会在战场上驻留、反复扑打的风雪**——施法者指定一块地方，
 *   风雪在那里成形，按固定间隔一阵一阵地扫过整片范围：范围内每个敌人每阵挨一次冻伤、被风往外推，
 *   并有概率被冻住；风暴停后地面铺上一层雪。它是全家里唯一「范围自己在持续输出」的招，站位读得出来：
 *   风暴圈在哪、圈里就一直在挨打，走出去就安全。
 *
 * 天气是材料（对应原生命中 70、雪天必中）：**下雨或雷暴**时风雪更猛——范围更大、每阵更狠、冰冻概率更高，
 *   本身也更容易罩住人；晴天则收小、变轻，能不能打到由站位决定，而不是掷命中。
 *
 * 与同族分开：
 *   暴风雪   —— 指定一块地方驻留、一阵阵反复扑打的圆域风雪。
 *   冰冻之风 —— 一堵会往前推、只扫过一次的走廊冷锋（另一单元）。
 *   细雪     —— 近身一片瞬发扇形乱雪，便宜可连放（同组）。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   gust         每阵威力 30 + 特攻偏移 + 等级偏移，呼啸式 ×0.9、下雨 ×1.12。
 *   rakes        扑打阵数 5 + 等级偏移，呼啸式 +2。
 *   rakeInterval 阵间隔 10 − 速度偏移 − 呼啸 2。
 *   radius       风暴半径 4.2 + 特攻偏移 + 碰撞箱高度偏移，呼啸 ×1.2、下雨 ×1.12。
 *   reach        落点距离 12 + 等级偏移 + 特攻偏移（驱动实际射程）。
 *   push         推离 0.9 + 特攻偏移，呼啸 ×1.3。
 *   freezeChance 冰冻概率 10%% + 特攻偏移，下雨 +5%%，呼啸 ×1.2。
 *   snowTicks    积雪停留 120 + 等级 ×0.8。
 *   snowCells    积雪块数 40 + 特攻 ×0.4（同时驱动画面密度）。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却；这是全家最贵的一招。
 *
 * 配置 howl（呼啸式）双向取舍：开启＝范围更大、阵数更多、推得更远、冰冻概率更高，但每阵更轻、起手与冷却更久；
 *   关闭＝范围收小、每阵更重、出手与回气更快。两个方向各有适用局面（封锁场地 vs 集中打击）。
 *
 * 伤害段 gust：每一阵扑打随精灵数据变化的那部分，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("blizzard", {
        /** 每阵威力：30 + 特攻偏移[−6,20] + 等级(≥30)偏移[0,8]，呼啸 ×0.9 / 集中 ×1.15，下雨 ×1.12；夹 16..58。 */
        gust: formula(
            F.base(30)
                .plus(F.stat("specialAttack").minus(60).times(0.16).clamp(-6, 20))
                .plus(F.level().minus(30).times(0.2).clamp(0, 8))
                .times(F.when(F.pref("howl"), F.const(0.9), F.const(1.15)))
                .times(F.when(F.world("rain").gt(0.2), F.const(1.12), F.const(1)))
                .clamp(16, 58).round(1),
            "每阵威力", {
                unit: "威力",
                description: "风雪每一阵扑在单个敌人身上那一下的基础威力；特攻与等级越高每阵越疼，集中式把风雪压得更重。对手特防、相性与暴击在每次命中时另算。"
            }),
        /** 扑打阵数：5 + 等级(≥30)偏移[0,2]，呼啸 +2；夹 3..9。 */
        rakes: formula(
            F.base(5).plus(F.level().minus(30).times(0.04).clamp(0, 2))
                .plus(F.when(F.pref("howl"), F.const(2), F.const(0)))
                .clamp(3, 9).round(0),
            "扑打阵数", {
                base: 5, unit: "阵",
                description: "风雪在场上扑打多少阵；等级越高、呼啸式越多，圈里的人挨的次数也越多。"
            }),
        /** 阵间隔：10 − 速度偏移[−2,3] − 呼啸 2；夹 6..16。 */
        rakeInterval: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .minus(F.when(F.pref("howl"), F.const(2), F.const(0)))
                .clamp(6, 16).round(0),
            "阵间隔", "两阵风雪之间隔多久；速度越快扑得越密，呼啸式更急。"),
        /** 风暴半径：4.2 + 特攻偏移[−0.6,1.4] + 碰撞箱高度偏移[−0.2,1.0]，呼啸 ×1.2、集中 ×0.85，下雨 ×1.12；夹 2.8..7.0。 */
        radius: formula(
            F.base(4.2)
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.6, 1.4))
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 1.0))
                .times(F.when(F.pref("howl"), F.const(1.2), F.const(0.85)))
                .times(F.when(F.world("rain").gt(0.2), F.const(1.12), F.const(1)))
                .clamp(2.8, 7.0).round(2),
            "风暴半径", {
                base: 4.2, unit: "格",
                description: "风雪罩住多大一圈，也是判定与画面的范围；大个子、特攻高更宽，下雨天更猛、呼啸式更开。"
            }),
        /** 落点距离：12 + 等级(≥30)偏移[0,3] + 特攻偏移[−1,2.5]；夹 9..16。 */
        reach: formula(
            F.base(12).plus(F.level().minus(30).times(0.06).clamp(0, 3))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 2.5))
                .clamp(9, 16).round(2),
            "落点距离", {
                base: 12, unit: "格",
                description: "能把风雪召唤到多远处；等级与特攻越高够得越远。它也是本招的实际射程来源。"
            }),
        /** 推离：0.9 + 特攻偏移[−0.2,0.7]，呼啸 ×1.3 / 集中 ×0.9；夹 0.4..2.2。 */
        push: formula(
            F.base(0.9).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.2, 0.7))
                .times(F.when(F.pref("howl"), F.const(1.3), F.const(0.9)))
                .clamp(0.4, 2.2).round(2),
            "推离", {
                unit: "格",
                description: "每一阵把圈里的敌人往外推多远；特攻越高风越猛，呼啸式推得更开。"
            }),
        /** 冰冻概率：10%% + 特攻偏移[0,12%%] + 下雨 5%%，呼啸 ×1.2；夹 6%%..34%%。 */
        freezeChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0009).clamp(0, 0.12))
                .plus(F.when(F.world("rain").gt(0.2), F.const(0.05), F.const(0)))
                .times(F.when(F.pref("howl"), F.const(1.2), F.const(1)))
                .clamp(0.06, 0.34).round(3),
            "冰冻概率", "每一阵被扑到后陷入冰冻的概率；特攻越高、雨雪越急越容易冻住，呼啸式更彻底。"),
        /** 积雪停留：120 + 等级 ×0.8；夹 60..240。 */
        snowTicks: seconds(
            F.base(120).plus(F.level().times(0.8)).clamp(60, 240).round(0),
            "积雪停留", "风暴停后地面那层雪停留多久；到期原方块回来。"),
        /** 积雪块数：40 + 特攻 ×0.4；夹 24..110。同时驱动画面密度。 */
        snowCells: formula(
            F.base(40).plus(F.stat("specialAttack").times(0.4)).clamp(24, 110).round(0),
            "积雪块数", {
                base: 40, unit: "块",
                description: "风暴在地面留下多少格雪；随特攻增长，也决定画面里雪层的密度。"
            }),
        /** 起手：16 − 速度偏移[−4,5]，呼啸 +3；夹 9..24。 */
        tempo: seconds(
            F.base(16).minus(F.stat("speed").minus(60).times(0.05).clamp(-4, 5))
                .plus(F.when(F.pref("howl"), F.const(3), F.const(0)))
                .clamp(9, 24).round(0),
            "起手", "聚云成雪所需的时间；这是全家最长的前摇之一，也最容易被先手打断。"),
        /** 收招：12 − 速度偏移[−3,4]，呼啸 +2；夹 7..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("howl"), F.const(2), F.const(0)))
                .clamp(7, 18).round(0),
            "收招", "风雪停后的收势；速度越快越利落。"),
        /** 冷却：70 − 速度偏移[−8,12]，呼啸 +8；夹 44..96。 */
        recharge: seconds(
            F.base(70).minus(F.stat("speed").minus(60).times(0.08).clamp(-8, 12))
                .plus(F.when(F.pref("howl"), F.const(8), F.const(0)))
                .clamp(44, 96).round(0),
            "冷却", "两场暴风雪之间的等待；这是全家最贵的招，呼啸式缓得更久。")
    });

    defineDamage("blizzard", "gust", {}, { flags: { wind: true } });

    stages("blizzard", [
        { level: 40, values: { gust: 40 } },
        { level: 58, values: { gust: 46, radius: 5.2 } }
    ]);

    describe("blizzard", [
        { key: "description.0", values: ["gust", "rakes"] },
        { key: "description.1", values: ["radius", "rakeInterval", "reach"] },
        { key: "description.2", values: ["push", "freezeChance"] },
        { key: "description.3", values: ["snowTicks", "snowCells"] },
        { key: "description.4", values: ["tempo", "aftercast", "recharge"] },
        { key: "weather", values: [] },
        { key: "howl.on", values: [], when: function (context) { return read(context.detail.values, ["howl"]) === true; } },
        { key: "howl.off", values: [], when: function (context) { return read(context.detail.values, ["howl"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gust"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.gust", "tier.1.radius"] }
    ]);
}
