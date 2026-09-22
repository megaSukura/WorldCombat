/**
 * 龙卷风 / twister 的参数与伤害段。
 *
 * 原生事实：Dragon／Special／威力 40／命中 100／PP 20／wind 标记／target allAdjacentFoes／20% 畏缩。
 * 翻译：把「兴起龙卷风，将对手卷入进行攻击」翻成一道**立在选定地点的持续旋涡**——它在原地转一段时间，
 * 涡边的人被风压向心拽、被抬离地面，每一小段时间被风刃刮一记；被卷住的人可能懵住。它是一招控场：
 * 伤害轻，范围会呼吸，走开就不再挨刮。与同族的区分：岩崩是砸下来的石头，冰柱坠击是从头顶落下的一根冰柱，
 * 怒火中烧是从自身炸开的气场；只有龙卷风是立在别处、持续把人拉进去。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   gust        每段风刃威力 15 基准 + 特攻偏移；爆发式更高、持续式更低。
 *   vortexRadius 旋涡半径 2.4 格 + 体型高度偏移 + 特攻（风越大铺得越开）。
 *   pull        每刻向心牵引 0.11 格 + 特攻；持续式 ×1.35 更黏。
 *   lift        每段把离地的人抬起 0.16 格 + 体型高度偏移。
 *   pulseTicks  两段风刃之间 6 刻 − 速度偏移（出手越快，风刃接得越密）。
 *   vortexTicks 旋涡持续 48 刻 + 体质（HP）偏移（肺活量撑得更久）+ 等级；持续式 ×1.4。
 *   reach       施放距离 9 格 + 等级 + 特攻。
 *   flinchChance 畏缩几率 0.18 + 特攻偏移。
 *
 * 配置 `hold`（持续涡旋）：开启＝转得更久、牵引更强，但每段风刃 ×0.85、冷却 +8；关闭＝转得短、牵引弱，
 * 但每段 ×1.2、冷却 −2。两向各有适用局面（锁住一片地 vs 尽快出伤）。
 *
 * 伤害段 `gust` 与参数同名，走共享换算。
 */
namespace PokemonSkills {
    actionParameters.define("twister", {
        /** 每段风刃：15 + 特攻偏移[−5,14]；持续 ×0.85 / 爆发 ×1.2；夹 8..34。 */
        gust: formula(
            F.base(15).plus(F.stat("specialAttack").minus(60).times(0.06).clamp(-5, 14))
                .times(F.when(F.pref("hold"), F.const(0.85), F.const(1.2)))
                .clamp(8, 34).round(1),
            "风刃威力", {
                unit: "威力",
                description: "旋涡每刮一次每人的威力；特攻越高风刃越利。对手防御、相性与暴击在命中时另算。"
            }),
        /** 旋涡半径：2.4 + 身高偏移[−0.3,1.0] + 特攻偏移[−0.3,0.7]；夹 1.8..4.2。 */
        vortexRadius: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.3, 0.7))
                .clamp(1.8, 4.2).round(2),
            "旋涡半径", {
                unit: "格",
                description: "旋涡在地上罩住多大一圈；个子高、特攻高的个体卷得更开。站在圈里的人才会被卷。"
            }),
        /** 向心牵引：0.11 + 特攻偏移[−0.03,0.08]；持续 ×1.35 / 爆发 ×0.75；夹 0.05..0.26。 */
        pull: formula(
            F.base(0.11).plus(F.stat("specialAttack").minus(60).times(0.0006).clamp(-0.03, 0.08))
                .times(F.when(F.pref("hold"), F.const(1.35), F.const(0.75)))
                .clamp(0.05, 0.26).round(3),
            "向心牵引", {
                unit: "格/刻",
                description: "旋涡每刻把圈内的人朝涡心拽多远；持续式更黏，能把人留在里面。"
            }),
        /** 抬升：0.16 + 身高偏移[−0.04,0.12]；持续 ×1.2 / 爆发 ×0.9；夹 0.08..0.34。 */
        lift: formula(
            F.base(0.16).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.04, 0.12))
                .times(F.when(F.pref("hold"), F.const(1.2), F.const(0.9)))
                .clamp(0.08, 0.34).round(3),
            "抬升", {
                unit: "格",
                description: "每段把还站在地上的人抬离地面的高度；「卷入」的画面由它决定。"
            }),
        /** 风刃间隔：6 − 速度偏移[−1.5,2]；夹 4..9。 */
        pulseTicks: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.01).clamp(-1.5, 2)).clamp(4, 9).round(0),
            "风刃间隔", "两段风刃之间隔多久；速度快的个体卷得更急。"),
        /** 旋涡持续：48 + HP 偏移[−10,20] + 等级偏移[0,20]；持续 ×1.4 / 爆发 ×0.7；夹 24..110。 */
        vortexTicks: seconds(
            F.base(48).plus(F.stat("hp").minus(60).times(0.12).clamp(-10, 20))
                .plus(F.level().minus(25).times(1).clamp(0, 20))
                .times(F.when(F.pref("hold"), F.const(1.4), F.const(0.7)))
                .clamp(24, 110).round(0),
            "旋涡持续", "旋涡在原地转多久；体质与等级越高撑得越久，持续式再翻长。"),
        /** 施放距离：9 + 等级偏移[0,3] + 特攻偏移[−1,1.6]；夹 7..13。 */
        reach: formula(
            F.base(9).plus(F.level().minus(25).times(0.05).clamp(0, 3))
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-1, 1.6))
                .clamp(7, 13).round(2),
            "施放距离", {
                unit: "格",
                description: "能把旋涡立到多远的地方；等级与特攻越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 畏缩几率：0.18 + 特攻偏移[−0.05,0.1]；夹 0.10..0.32。 */
        flinchChance: percent(
            F.base(0.18).plus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.05, 0.1)).clamp(0.10, 0.32),
            "畏缩几率", "被风刃刮实时的畏缩几率；特攻越高越容易把人卷懵。"),
        flinchTicks: ticks(12, "畏缩持续", "被卷懵的人在这段时间内无法开始新动作。"),
        maxTargets: hidden(8)
    });

    defineDamage("twister", "gust", {});

    stages("twister", [
        { level: 28, values: { gust: 18 } },
        { level: 46, values: { gust: 22, vortexRadius: 3.0, vortexTicks: 60 } }
    ]);

    describe("twister", [
        { key: "description.0", values: ["gust", "pulseTicks"] },
        { key: "description.1", values: ["vortexRadius", "vortexTicks"] },
        { key: "description.2", values: ["pull", "lift"] },
        { key: "description.3", values: ["reach"] },
        { key: "description.4", values: ["flinchChance", "flinchTicks"] },
        { key: "hold.on", values: [], when: function (context) { return read(context.detail.values, ["hold"]) === true; } },
        { key: "hold.off", values: [], when: function (context) { return read(context.detail.values, ["hold"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gust"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.gust", "tier.1.vortexRadius", "tier.1.vortexTicks"] }
    ]);
}
