/**
 * 怒火中烧 / fierywrath 的参数与伤害段。
 *
 * 原生事实：Dark／Special／威力 90／命中 100／PP 10／target allAdjacentFoes／20% 畏缩（签名招式，伽勒尔火焰鸟）。
 * 翻译：把「将愤怒转化为火焰般的气场进行攻击」翻成一道**从自身向外炸开的环状气场**——它必须以自己为中心，
 * 所以要把自己送进人堆里才打得到人；近处被灼得更狠，圈内所有人被震得可能懵住，开启余怒时气场还留一会儿、
 * 持续灼烧没走开的人。与同族区分：岩崩是撒向前方的石头雨，冰柱坠击是从头顶落下的一根冰柱，龙卷风是立在
 * 别处的持续旋涡；只有怒火中烧是从自己身上炸开、要求站位的气场。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   wrath       爆发威力 82 + 特攻偏移 + **当前已损失生命比例**偏移（越受伤、怒火越盛，最多 +18）；余怒式 ×0.8。
 *   afterglow   余怒每段威力 16 + 特攻偏移（余怒式开启后才使用）。
 *   auraRadius  气场半径 3.0 格 + 体型高度偏移 + 特攻偏移（气场越大站得越远也会被扫到）。
 *   edgeKeep    边缘保底比例 0.55 + 特攻偏移（越强，远端的衰减越平）。
 *   push        向外推开 0.3 格 + 特攻偏移；余怒式略弱，好把人留在气场里接着灼。
 *   lingerTicks 余怒持续 40 刻 + 体质（HP）偏移 + 等级（撑得越久）。
 *   pulseTicks  余怒两段之间 8 刻 − 速度偏移（出手越快余怒跳得越密）。
 *   flinchChance 畏缩几率 0.20 + 特攻偏移。
 *
 * 配置 `linger`（余怒）：开启＝爆发 ×0.8、向外推更弱，但炸开后气场持续灼烧没走开的人，冷却 +10；
 * 关闭＝一次更重的爆发、无持续，冷却 −2。两向各有适用局面（留住人群反复灼 vs 一发打疼）。
 *
 * 伤害段 `wrath`（爆发）与 `afterglow`（余怒）各自成段。
 */
namespace PokemonSkills {
    actionParameters.define("fierywrath", {
        /** 爆发威力：82 + 特攻偏移[−16,44] + 已损失生命比例 ×18[0,18]；余怒 ×0.8 / 爆发 ×1.12；夹 48..150。 */
        wrath: formula(
            F.base(82).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-16, 44))
                .plus(F.const(1).minus(F.actor("healthRatio")).times(18).clamp(0, 18))
                .times(F.when(F.pref("linger"), F.const(0.8), F.const(1.12)))
                .clamp(48, 150).round(1),
            "爆发威力", {
                unit: "威力",
                description: "气场炸开那一下的威力；特攻越高、自己越受伤，怒火越盛。对手防御、相性与暴击在命中时另算。"
            }),
        /** 余怒威力：16 + 特攻偏移[−4,12]；夹 8..34。 */
        afterglow: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-4, 12)).clamp(8, 34).round(1),
            "余怒威力", {
                unit: "威力",
                description: "余怒式下，气场每跳一次对圈内每人造成的伤害。"
            }),
        /** 气场半径：3.0 + 身高偏移[−0.35,1.1] + 特攻偏移[−0.3,0.8]；夹 2.2..5.0。 */
        auraRadius: formula(
            F.base(3).plus(F.body("height").minus(1.4).times(0.55).clamp(-0.35, 1.1))
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.3, 0.8))
                .clamp(2.2, 5.0).round(2),
            "气场半径", {
                unit: "格",
                description: "气场从自身向外罩住多大一圈；大个子、特攻高的个体炸得更开。它也是本招的施放距离与 AI 的站位距离。"
            }),
        /** 边缘保底：0.55 + 特攻偏移[−0.05,0.12]；夹 0.45..0.72。 */
        edgeKeep: percent(
            F.base(0.55).plus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.05, 0.12)).clamp(0.45, 0.72),
            "边缘保底", "站在气场最外圈的人至少会吃到爆发威力的这个比例；越近吃得越足。"),
        /** 向外推开：0.3 + 特攻偏移[−0.1,0.4]；余怒 ×0.8 / 爆发 ×1.1；夹 0.15..0.75。 */
        push: formula(
            F.base(0.3).plus(F.stat("specialAttack").minus(60).times(0.003).clamp(-0.1, 0.4))
                .times(F.when(F.pref("linger"), F.const(0.8), F.const(1.1)))
                .clamp(0.15, 0.75).round(2),
            "向外推开", {
                unit: "格",
                description: "命中后把圈内的人沿气场方向推开的距离；余怒式推得更轻，好把人留在气场里接着灼。"
            }),
        /** 余怒持续：40 + HP 偏移[−8,18] + 等级偏移[0,12]；夹 24..70。 */
        lingerTicks: seconds(
            F.base(40).plus(F.stat("hp").minus(60).times(0.12).clamp(-8, 18))
                .plus(F.level().minus(25).times(0.6).clamp(0, 12))
                .clamp(24, 70).round(0),
            "余怒持续", "开启余怒时，气场在炸开之后继续灼烧多久。"),
        /** 余怒间隔：8 − 速度偏移[−1.5,2.5]；夹 5..11。 */
        pulseTicks: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.01).clamp(-1.5, 2.5)).clamp(5, 11).round(0),
            "余怒间隔", "余怒两段灼烧之间隔多久；速度快的个体跳得更密。"),
        /** 畏缩几率：0.20 + 特攻偏移[−0.05,0.1]；夹 0.10..0.34。 */
        flinchChance: percent(
            F.base(0.20).plus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.05, 0.1)).clamp(0.10, 0.34),
            "畏缩几率", "被气场震实时的畏缩几率；特攻越高越容易把人震懵。"),
        flinchTicks: ticks(14, "畏缩持续", "被震懵的人在这段时间内无法开始新动作。"),
        maxTargets: hidden(10)
    });

    defineDamage("fierywrath", "wrath", {});
    defineDamage("fierywrath", "afterglow", {});

    stages("fierywrath", [
        { level: 40, values: { wrath: 92 } },
        { level: 58, values: { wrath: 108, auraRadius: 3.8, flinchChance: 0.28 } }
    ]);

    describe("fierywrath", [
        { key: "description.0", values: ["wrath", "auraRadius"] },
        { key: "description.1", values: ["edgeKeep", "push"] },
        { key: "description.2", values: ["flinchChance","flinchTicks"] },
        { key: "description.3", values: ["afterglow","lingerTicks","pulseTicks"] },
        { key: "linger.on", values: [], when: function (context) { return read(context.detail.values, ["linger"]) === true; } },
        { key: "linger.off", values: [], when: function (context) { return read(context.detail.values, ["linger"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wrath"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wrath", "tier.1.auraRadius", "tier.1.flinchChance"] }
    ]);
}
