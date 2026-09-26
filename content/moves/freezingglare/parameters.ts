/**
 * 冰冷视线 / freezingglare 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Psychic／特殊／威力 90／命中 100／PP 10／单体；10%% 概率使目标冰冻；
 *   1 位学习者（伽勒尔急冻鸟的签名招）。
 *
 * 世界化：把「从双眼发射精神力量」落成一记**瞬发、不飞行的精神视线**——施法者抬眼锁定，念力线直接从一个
 *   目标跳到下一个最近的目标（每跳一拍），一路在敌人之间传递；精神主伤与冰冻分别遵守原生类型、特性与
 *   Boss 控制免疫，没有隐藏的穿透窗口。它是全家里唯一的一击必中「点名」，靠视线命中、不靠弹道；反制是
 *   切断视线（躲到掩体后或绕背）。
 *
 * 与同族分开：
 *   冰冷视线 —— 瞬发精神视线，会在通视的敌人之间跳跃，冰冻照常吃类型/特性免疫。
 *   冰冻光束 —— 停留片刻但只沿一条固定直线的窄光束，不跳（同组）。
 *   细雪     —— 近身便宜可连放的宽扇（同组）。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   glare          首目标威力 84 + 特攻偏移 + 等级偏移，凝视式 ×1.08。
 *   falloff        每跳衰减 0.64 + 特攻偏移（特攻越高念力线传得越稳）。
 *   chains         跳跃数 2 + 特攻偏移 + 等级偏移 + 凝视式 1。
 *   chainRange     跳跃距离 4.5 + 特攻偏移（下一跳能有多远）。
 *   reach          视距射程 11 + 等级偏移 + 特攻偏移（驱动实际射程）。
 *   freezeChance   冰冻概率 14%% + 特攻偏移 + 等级偏移，凝视式 ×1.2（全家最高，但仍受类型/特性/Boss 免疫约束）。
 *   tempo/aftermath/wait 速度决定起手、收招与冷却，凝视式更沉。
 *
 * 配置 unblinking（凝视式）双向取舍：开启＝多一跳、射程更远、冰冻概率更高，但起手与冷却更久；
 *   关闭＝速瞥式，出手快、冷却短，但只跳得更少、更近、冰冻概率略低。两个方向各有适用局面。
 *
 * 伤害段 glare：随精灵数据变化的那部分，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("freezingglare", {
        /** 首目标威力：84 + 特攻偏移[−14,48] + 等级(≥30)偏移[0,12]，凝视 ×1.08 / 速瞥 ×0.96；夹 48..155。 */
        glare: formula(
            F.base(84)
                .plus(F.stat("specialAttack").minus(60).times(0.40).clamp(-14, 48))
                .plus(F.level().minus(30).times(0.25).clamp(0, 12))
                .times(F.when(F.pref("unblinking"), F.const(1.08), F.const(0.96)))
                .clamp(48, 155).round(1),
            "首目标威力", {
                unit: "威力",
                description: "视线落到第一个目标身上那一下的基础威力；特攻越强、等级越高越冷。对手特防、相性与暴击在命中时另算。"
            }),
        /** 每跳衰减：0.64 + 特攻偏移[−0.06,0.12]；夹 0.45..0.85。 */
        falloff: formula(
            F.base(0.64).plus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.06, 0.12)).clamp(0.45, 0.85).round(3),
            "每跳衰减", {
                unit: "倍",
                description: "每往后跳一个目标，威力乘上这个系数；特攻越高念力线传得越稳、衰减越少。"
            }),
        /** 跳跃数：2 + 特攻偏移[0,2] + 等级偏移[0,1] + 凝视式 1；夹 1..4。 */
        chains: formula(
            F.base(2).plus(F.stat("specialAttack").minus(60).times(0.015).clamp(0, 2))
                .plus(F.level().minus(30).times(0.01).clamp(0, 1))
                .plus(F.when(F.pref("unblinking"), F.const(1), F.const(0)))
                .clamp(1, 4).round(0),
            "跳跃数", {
                base: 2, unit: "个",
                description: "念力线最多能落在几个目标上（含第一个）；特攻与等级越高跳得越多，凝视式多一跳。"
            }),
        /** 跳跃距离：4.5 + 特攻偏移[−0.5,1.5]；夹 3..7。 */
        chainRange: formula(
            F.base(4.5).plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.5, 1.5)).clamp(3, 7).round(2),
            "跳跃距离", {
                base: 4.5, unit: "格",
                description: "念力线从一个目标能跳到多远的下一个目标；特攻越强跳得越远。"
            }),
        /** 视距射程：11 + 等级(≥30)偏移[0,3] + 特攻偏移[−1,2.2]，凝视 ×1.08 / 速瞥 ×0.95；夹 8..16。 */
        reach: formula(
            F.base(11)
                .plus(F.level().minus(30).times(0.06).clamp(0, 3))
                .plus(F.stat("specialAttack").minus(60).times(0.015).clamp(-1, 2.2))
                .times(F.when(F.pref("unblinking"), F.const(1.08), F.const(0.95)))
                .clamp(8, 16).round(2),
            "视距射程", {
                base: 11, unit: "格",
                description: "视线能锁定多远的目标；等级与特攻越高越远。它也是本招的实际射程来源，且需要一条没有被挡住的视线。"
            }),
        /** 冰冻概率：14%% + 特攻偏移[0,14%%] + 等级偏移[0,6%%]，凝视 ×1.2；夹 8%%..38%%。 */
        freezeChance: percent(
            F.base(0.14)
                .plus(F.stat("specialAttack").minus(60).times(0.001).clamp(0, 0.14))
                .plus(F.level().minus(30).times(0.001).clamp(0, 0.06))
                .times(F.when(F.pref("unblinking"), F.const(1.2), F.const(1)))
                .clamp(0.08, 0.38).round(3),
            "冰冻概率", "每个被视线盯到的目标各自掷一次的这个概率陷入冰冻；这是全家最高的一档，但仍受冰属性、免冻特性与 Boss 控制免疫约束。"),
        /** 起手：8 − 速度偏移[−2,3] + 凝视式 2；夹 5..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("unblinking"), F.const(2), F.const(0)))
                .clamp(5, 13).round(0),
            "起手", "抬眼锁定念力线的时间；速度越快越短，凝视式多凝一瞬。"),
        /** 收招：7 − 速度偏移[−1.5,3]；夹 4..11。 */
        aftermath: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 3)).clamp(4, 11).round(0),
            "收招", "收回视线后的收势；快个体更利落。"),
        /** 冷却：36 − 速度偏移[−5,8] + 凝视式 6；夹 22..54。 */
        wait: seconds(
            F.base(36).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 8))
                .plus(F.when(F.pref("unblinking"), F.const(6), F.const(0)))
                .clamp(22, 54).round(0),
            "冷却", "两次凝视之间的等待；速度越快回得越快，凝视式缓得更久。")
    });

    defineDamage("freezingglare", "glare", {});

    stages("freezingglare", [
        { level: 40, values: { glare: 104 } },
        { level: 58, values: { glare: 116, chains: 3 } }
    ]);

    describe("freezingglare", [
        { key: "description.0", values: ["glare","chains","falloff"] },
        { key: "description.1", values: ["reach","chainRange"] },
        { key: "description.2", values: ["freezeChance"] },
        { key: "description.3", values: ["tempo", "aftermath", "wait"] },
        { key: "unblinking.on", values: [], when: function (context) { return read(context.detail.values, ["unblinking"]) === true; } },
        { key: "unblinking.off", values: [], when: function (context) { return read(context.detail.values, ["unblinking"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.glare"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.glare", "tier.1.chains"] }
    ]);
}
