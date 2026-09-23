/**
 * 岩崩 / rockslide 的参数与伤害段。
 *
 * 原生事实：Rock／Physical／威力 75／命中 90／PP 10／target allAdjacentFoes／30% 畏缩。
 * 翻译：把「将大岩石猛烈地撞向对手」翻成一次**朝选定地面连续甩出的碎石雨**——施法者把身前地面上的岩石
 * 一块块沿弧线抛向那片地，每块岩石落在自己那一小块上，砸中站在那里的敌人；最先砸实的那块决定畏缩的拳头。
 * 它是一招覆盖，不是一发点杀：岩石块数决定能罩住多大的地、谁会被扫到，每块本身不重。
 * 与同族的区分（同一念头，四种落法）：
 *   岩崩     —— 多块碎石沿弧线落向前方一片地，覆盖最广。
 *   冰柱坠击 —— 一根巨大冰柱从正上方落到单个目标头上。
 *   龙卷风   —— 在选定点升起持续旋涡，把周围的人向心卷起。
 *   怒火中烧 —— 从自身向外炸开火焰气场，必须站在人堆中间。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   rockfall       单块碎岩威力 46 基准 + 物攻偏移 + 体重偏移（石头是身体举起来的份量）。
 *   boulders       岩石块数 3 基准 + 物攻偏移 + 等级台阶；散布式再多 1.5 倍。
 *   spread         覆盖半径 2.6 格 + 体型高度偏移（个子高的人把雨撒得更开）。
 *   rockRadius     单块判定 1.05 格 + 体型高度偏移。
 *   throwSpeed     出手速度 0.95 格/刻 + 速度偏移（手快的人抛得更急、更难躲）。
 *   reach          施放距离 9 格 + 等级 + 物攻（力量把这把雨送得更远）。
 *   flinchChance   畏缩几率 0.24 + 物攻偏移；散布式每块更轻所以略降。
 *   interval       两块之间的间隔 4 刻 − 速度偏移（手快的连得更快）。
 *   rubbleTicks    落点碎石停留 80 刻 + 等级（地面被砸出的碎石堆留多久）。
 *
 * 配置 `scatter`（散布式）：开启＝块数 ×1.5、覆盖半径 ×1.35、单块 ×0.82、畏缩略降，用来扫一片；
 * 关闭＝块数 ×0.7、覆盖 ×0.8、单块 ×1.16、畏缩略升，把伤害集中到目标身上。两向各有适用局面。
 *
 * 伤害段 `rockfall` 与参数同名，走共享换算。
 */
namespace PokemonSkills {
    actionParameters.define("rockslide", {
        /** 单块碎岩：46 + 物攻偏移[−14,30] + 体重偏移[−6,10]；散布 ×0.82 / 集中 ×1.16；夹 26..92。 */
        rockfall: formula(
            F.base(46)
                .plus(F.stat("attack").minus(60).times(0.12).clamp(-14, 30))
                .plus(F.body("weight").minus(300).times(0.004).clamp(-6, 10))
                .times(F.when(F.pref("scatter"), F.const(0.82), F.const(1.16)))
                .clamp(26, 92).round(1),
            "碎岩威力", {
                unit: "威力",
                description: "单块岩石砸实那一下的威力；物攻越高、身体越沉，抛出去的岩石越有力；散布式把力分给更多块。对手防御、相性与暴击在命中时另算。"
            }),
        /** 岩石块数：3 + 物攻偏移[−0.8,1.8] + 等级(≥30)偏移[0,1.4]；散布 ×1.5 / 集中 ×0.7；夹 1..7。 */
        boulders: formula(
            F.base(3)
                .plus(F.stat("attack").minus(60).times(0.012).clamp(-0.8, 1.8))
                .plus(F.level().minus(30).times(0.02).clamp(0, 1.4))
                .times(F.when(F.pref("scatter"), F.const(1.5), F.const(0.7)))
                .clamp(1, 7).round(0),
            "岩石数量", {
                unit: "块",
                description: "一次甩出几块岩石；块数越多覆盖越广、砸中机会越多，但每块更轻。"
            }),
        /** 覆盖半径：2.6 + 身高偏移[−0.4,1.2]；散布 ×1.35 / 集中 ×0.8；夹 1.6..4.4。 */
        spread: formula(
            F.base(2.6)
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.4, 1.2))
                .times(F.when(F.pref("scatter"), F.const(1.35), F.const(0.8)))
                .clamp(1.6, 4.4).round(2),
            "覆盖半径", {
                unit: "格",
                description: "选定落点周围能被岩石雨罩住的范围；个子高的个体撒得更开。它也是指示圈的半径。"
            }),
        /** 单块判定：1.05 + 身高偏移[−0.15,0.4]；夹 0.8..1.6。 */
        rockRadius: formula(
            F.base(1.05).plus(F.body("height").minus(1.4).times(0.2).clamp(-0.15, 0.4)).clamp(0.8, 1.6).round(2),
            "单块判定", {
                unit: "格",
                description: "每块岩石落地时能砸到多大一小圈；大个子甩出的岩石更大。"
            }),
        /** 投掷速度：0.95 + 速度偏移[−0.18,0.4]；夹 0.7..1.4。 */
        throwSpeed: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.18, 0.4)).clamp(0.7, 1.4).round(2),
            "投掷速度", {
                unit: "格/刻",
                description: "岩石离手时的速度；速度快的个体抛得更急，目标更难在半空走开。"
            }),
        /** 施放距离：9 + 等级(≥25)偏移[0,3] + 物攻偏移[−1.2,2]；夹 7..13。 */
        reach: formula(
            F.base(9).plus(F.level().minus(25).times(0.05).clamp(0, 3))
                .plus(F.stat("attack").minus(60).times(0.01).clamp(-1.2, 2))
                .clamp(7, 13).round(2),
            "施放距离", {
                unit: "格",
                description: "能把岩石雨撒到多远的地面；力量与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 畏缩几率：0.24 + 物攻偏移[−0.05,0.1]；散布 ×0.9 / 集中 ×1.12；夹 0.12..0.40。 */
        flinchChance: percent(
            F.base(0.24).plus(F.stat("attack").minus(60).times(0.001).clamp(-0.05, 0.1))
                .times(F.when(F.pref("scatter"), F.const(0.9), F.const(1.12))).clamp(0.12, 0.40),
            "畏缩几率", "被岩石砸实时的基础畏缩几率；物攻越高越容易把人砸懵，集中式更高。"),
        flinchTicks: ticks(14, "畏缩持续", "被砸懵的人在这段时间内无法开始新动作。"),
        /** 投掷间隔：4 − 速度偏移[−1,1.5]；夹 2..6；驱动逐块抛出的节拍。 */
        interval: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.006).clamp(-1, 1.5)).clamp(2, 6).round(0),
            "投掷间隔", "两块岩石之间隔多久；速度快的个体连得更快。"),
        /** 碎石停留：80 + 等级 ×0.6；夹 50..150；落点被砸出的碎石地面留着，到期原方块回来。 */
        rubbleTicks: seconds(
            F.base(80).plus(F.level().times(0.6)).clamp(50, 150).round(0),
            "碎石停留", "落点被砸出的碎石地面停留多久；到期原方块回来。"),
        /** 同一目标一次施放最多被砸几次，避免多块叠在同一人身上。 */
        hitCap: hidden(2)
    });

    defineDamage("rockslide", "rockfall", {});

    stages("rockslide", [
        { level: 30, values: { rockfall: 54 } },
        { level: 48, values: { rockfall: 62, boulders: 4, flinchChance: 0.32 } }
    ]);

    describe("rockslide", [
        { key: "description.0", values: ["rockfall", "rockRadius"] },
        { key: "description.1", values: ["boulders", "spread"] },
        { key: "description.2", values: ["reach", "throwSpeed"] },
        { key: "description.3", values: ["flinchChance","flinchTicks"] },
        { key: "description.4", values: ["rubbleTicks"] },
        { key: "scatter.on", values: [], when: function (context) { return read(context.detail.values, ["scatter"]) === true; } },
        { key: "scatter.off", values: [], when: function (context) { return read(context.detail.values, ["scatter"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rockfall"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.rockfall", "tier.1.boulders", "tier.1.flinchChance"] }
    ]);
}
