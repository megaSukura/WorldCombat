/**
 * 细雪 / powdersnow 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Ice／特殊／威力 40／命中 100／PP 25／target allAdjacentFoes；10%% 概率使目标冰冻。
 *
 * 世界化：把「将冰冷的细雪吹向对手」落成近身一口**又宽又短的扇形雪霰**——它不追求打多远，追求便宜、
 *   出手快、能反复放，一口罩住身前扇面里的几个敌人，各挨一次轻冻伤、被吹退半步，并各自掷一次冰冻。
 *   它是全家最便宜的「连续掷冰冻」工具：单次很轻，但冷却短、能一直吹。
 *
 * 与同族分开：
 *   细雪     —— 近身瞬发、便宜可连放的宽扇雪霰。
 *   冰冻之风 —— 一堵会往前推、只扫过一次的走廊冷锋；范围更窄、更远、有减速（另一单元）。
 *   冰冻光束 —— 瞬发贯穿的窄光束，射程长、可穿人（同组）。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   puff         每目标威力 34 + 特攻偏移 + 等级偏移，乱雪式 ×0.85、细雪式 ×1.15。
 *   range        吹拂距离 5.5 + 特攻偏移 + 碰撞箱高度偏移，乱雪 ×1.15（驱动实际射程）。
 *   angle        扇面半角 40 + 特攻偏移，乱雪 ×1.25（判定与画面同一条扇面）。
 *   maxTargets   命中上限 3 + 特攻偏移 + 乱雪 1。
 *   push         推退 0.35 + 特攻偏移（近身半步）。
 *   freezeChance 冰冻概率 10%% + 特攻偏移，乱雪 +3%%（全家唯一靠次数堆冰冻的招）。
 *   tempo/aftermath/wait 速度决定起手、收招与冷却；这是全家最快的节奏。
 *
 * 配置 flurry（乱雪式）双向取舍：开启＝扇面更宽更远、能打更多人、冰冻概率更高，但每人吃得轻、冷却略长；
 *   关闭＝细雪式，扇面收窄、每人更重、冷却更短。两个方向各有适用局面（多点掷冰冻 vs 近身点伤）。
 *
 * 伤害段 puff：命中那一下随精灵数据变化的那部分，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("powdersnow", {
        /** 每目标威力：34 + 特攻偏移[−6,22] + 等级(≥30)偏移[0,6]，乱雪 ×0.85 / 细雪 ×1.15；夹 18..64。 */
        puff: formula(
            F.base(34)
                .plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-6, 22))
                .plus(F.level().minus(30).times(0.15).clamp(0, 6))
                .times(F.when(F.pref("flurry"), F.const(0.85), F.const(1.15)))
                .clamp(18, 64).round(1),
            "每目标威力", {
                unit: "威力",
                description: "扇面里每个敌人各挨一次的基础威力；特攻越强、等级越高越疼，细雪式把一口雪压得更实。对手特防、相性与暴击在命中时另算。"
            }),
        /** 吹拂距离：5.5 + 特攻偏移[−0.5,1.2] + 碰撞箱高度偏移[−0.2,0.8]，乱雪 ×1.15 / 细雪 ×0.92；夹 4..8。 */
        range: formula(
            F.base(5.5)
                .plus(F.stat("specialAttack").minus(60).times(0.01).clamp(-0.5, 1.2))
                .plus(F.body("height").minus(1.4).times(0.3).clamp(-0.2, 0.8))
                .times(F.when(F.pref("flurry"), F.const(1.15), F.const(0.92)))
                .clamp(4, 8).round(2),
            "吹拂距离", {
                base: 5.5, unit: "格",
                description: "这口雪能吹多远；特攻与身高让它够到更远一点。它也是本招的实际射程与画面里扇面的长度。"
            }),
        /** 扇面半角：40 + 特攻偏移[−6,14]，乱雪 ×1.25 / 细雪 ×0.8；夹 22..70。 */
        angle: formula(
            F.base(40).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-6, 14))
                .times(F.when(F.pref("flurry"), F.const(1.25), F.const(0.8)))
                .clamp(22, 70).round(0),
            "扇面半角", {
                base: 40, unit: "度",
                description: "扇面从瞄准线向两侧各张开多少度，决定它有多宽，也是画面里那片雪霰的范围。"
            }),
        /** 命中上限：3 + 特攻偏移[0,2] + 乱雪 1；夹 2..7。 */
        maxTargets: formula(
            F.base(3).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 2))
                .plus(F.when(F.pref("flurry"), F.const(1), F.const(0)))
                .clamp(2, 7).round(0),
            "命中上限", {
                base: 3, unit: "个",
                description: "一口雪最多罩住几个敌人；特攻越高、乱雪式扇得更开。"
            }),
        /** 推退：0.35 + 特攻偏移[−0.08,0.35]；夹 0.15..0.9。 */
        push: formula(
            F.base(0.35).plus(F.stat("specialAttack").minus(60).times(0.003).clamp(-0.08, 0.35)).clamp(0.15, 0.9).round(2),
            "推退", {
                unit: "格",
                description: "被这口雪吹到的人被推退多远；只有半步，但足以把人挤出贴身位置。"
            }),
        /** 冰冻概率：10%% + 特攻偏移[0,12%%] + 乱雪 3%%；夹 6%%..32%%。 */
        freezeChance: percent(
            F.base(0.10)
                .plus(F.stat("specialAttack").minus(60).times(0.0009).clamp(0, 0.12))
                .plus(F.when(F.pref("flurry"), F.const(0.03), F.const(0)))
                .clamp(0.06, 0.32).round(3),
            "冰冻概率", "每个被吹到的目标各自掷一次的这个概率陷入冰冻；它靠出手次数堆积，而不是一击定胜负。"),
        /** 起手：6 − 速度偏移[−2,3]；夹 3..9。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3)).clamp(3, 9).round(0),
            "起手", "吸一口气把雪吹出去的时间；速度越快几乎瞬发。"),
        /** 收招：5 − 速度偏移[−1.5,2]；夹 3..8。 */
        aftermath: seconds(
            F.base(5).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2)).clamp(3, 8).round(0),
            "收招", "吹完之后的收势；快个体更快回位。"),
        /** 冷却：15 − 速度偏移[−3,4] + 乱雪 2；夹 8..26。 */
        wait: seconds(
            F.base(15).minus(F.stat("speed").minus(60).times(0.05).clamp(-3, 4))
                .plus(F.when(F.pref("flurry"), F.const(2), F.const(0)))
                .clamp(8, 26).round(0),
            "冷却", "两口雪之间的等待；这是全家最短的一档，速度越快越能连着吹。")
    });

    defineDamage("powdersnow", "puff", {});

    stages("powdersnow", [
        { level: 24, values: { puff: 44 } },
        { level: 44, values: { puff: 52, range: 6.3 } }
    ]);

    describe("powdersnow", [
        { key: "description.0", values: ["puff", "maxTargets"] },
        { key: "description.1", values: ["range", "angle", "push"] },
        { key: "description.2", values: ["freezeChance"] },
        { key: "description.3", values: ["tempo", "aftermath", "wait"] },
        { key: "flurry.on", values: [], when: function (context) { return read(context.detail.values, ["flurry"]) === true; } },
        { key: "flurry.off", values: [], when: function (context) { return read(context.detail.values, ["flurry"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.puff"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.puff", "tier.1.range"] }
    ]);
}
