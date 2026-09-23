/**
 * 冰柱坠击 / iciclecrash 的参数与伤害段。
 *
 * 原生事实：Ice／Physical／威力 85／命中 90／PP 10／target normal／30% 畏缩。
 * 翻译：把「用大冰柱激烈地撞向对手」翻成一根**从目标正上方坠落的大冰柱**——冰柱在目标头顶凝成、垂直砸下，
 * 砸实的一瞬碎冰四散、地面结出一小片冰。它是单点重击，落点在出手时定死，对手可以在冰柱落下前走开；
 * 高空式更重、更能波及旁边，但落下更久、更好躲。与同族区分：岩崩是横扫一片的石头雨，龙卷风是立着的持续旋涡，
 * 怒火中烧是从自身炸开的气场；只有冰柱坠击是从天上落到单个目标头上。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   shatter      碎冰威力 70 基准 + 物攻偏移 + 体重偏移（冰柱的份量）；高空式 ×1.15。
 *   dropHeight   坠落高度 5.5 格 + 体质（HP）偏移（撑得住更高的冰柱）；高空式 ×1.6、近落 ×0.75。
 *   crackRadius  落点碎裂半径 1.7 格 + 体型高度偏移；高空式 ×1.2。
 *   fallSpeed    下落速度 1.25 格/刻 + 速度偏移；高空式更慢（更好躲），近落式更快。
 *   icicleRadius 冰柱判定 0.5 格 + 体型高度偏移。
 *   reach        施放距离 9 格 + 等级 + 物攻。
 *   flinchChance 畏缩几率 0.26 + 物攻偏移 + 体重偏移。
 *   iceTicks     地面结冰停留 70 刻 + 等级。
 *
 * 配置 `tall`（高空坠柱）：开启＝更高更重、波及更广，但准备更久、下落更慢（目标有更多时间走开）；
 * 关闭＝近距快落，更轻更窄，但几乎躲不掉。两向各有适用局面。
 *
 * 伤害段 `shatter` 与参数同名，走共享换算。
 */
namespace PokemonSkills {
    actionParameters.define("iciclecrash", {
        /** 碎冰威力：70 + 物攻偏移[−18,36] + 体重偏移[−8,14]；高空 ×1.15 / 近落 ×0.9；夹 40..130。 */
        shatter: formula(
            F.base(70)
                .plus(F.stat("attack").minus(60).times(0.16).clamp(-18, 36))
                .plus(F.body("weight").minus(300).times(0.005).clamp(-8, 14))
                .times(F.when(F.pref("tall"), F.const(1.15), F.const(0.9)))
                .clamp(40, 130).round(1),
            "碎冰威力", { base: 70,
                unit: "威力",
                description: "冰柱砸实那一下的威力；物攻越高、体格越沉，冰柱越重；高空式更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 坠落高度：5.5 + HP 偏移[−1,2.5]；高空 ×1.6 / 近落 ×0.75；夹 3.5..12。 */
        dropHeight: formula(
            F.base(5.5).plus(F.stat("hp").minus(60).times(0.02).clamp(-1, 2.5))
                .times(F.when(F.pref("tall"), F.const(1.6), F.const(0.75)))
                .clamp(3.5, 12).round(2),
            "坠落高度", {
                unit: "格",
                description: "冰柱在目标上方多高凝成；体质越强撑得越高，高空式再翻高。高度也决定目标有多少时间走开。"
            }),
        /** 碎裂半径：1.7 + 身高偏移[−0.25,0.9]；高空 ×1.2 / 近落 ×0.85；夹 1.2..3.0。 */
        crackRadius: formula(
            F.base(1.7).plus(F.body("height").minus(1.4).times(0.45).clamp(-0.25, 0.9))
                .times(F.when(F.pref("tall"), F.const(1.2), F.const(0.85)))
                .clamp(1.2, 3.0).round(2),
            "碎裂半径", { base: 1.7,
                unit: "格",
                description: "冰柱落地时碎冰能扫到多大一圈；大个子砸得更开。站在圈里的敌人都会被扫到。"
            }),
        /** 下落速度：1.25 + 速度偏移[−0.2,0.4]；高空 ×0.72 / 近落 ×1.15；夹 0.7..1.8。 */
        fallSpeed: formula(
            F.base(1.25).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.2, 0.4))
                .times(F.when(F.pref("tall"), F.const(0.72), F.const(1.15)))
                .clamp(0.7, 1.8).round(2),
            "下落速度", {
                unit: "格/刻",
                description: "冰柱每刻下落多少；高空式更慢，目标有更多时间走开；近落式更快，几乎躲不掉。"
            }),
        /** 冰柱判定：0.5 + 身高偏移[−0.08,0.25]；夹 0.38..0.85。 */
        icicleRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.08, 0.25)).clamp(0.38, 0.85).round(2),
            "冰柱判定", {
                unit: "格",
                description: "坠落中冰柱的横向判定半径；大个子凝出的冰柱更粗。"
            }),
        /** 施放距离：9 + 等级偏移[0,3] + 物攻偏移[−1,1.6]；夹 7..12.5。 */
        reach: formula(
            F.base(9).plus(F.level().minus(25).times(0.05).clamp(0, 3))
                .plus(F.stat("attack").minus(60).times(0.01).clamp(-1, 1.6))
                .clamp(7, 12.5).round(2),
            "施放距离", {
                unit: "格",
                description: "能对多远的单个目标落下冰柱；等级与物攻越高够得越远。它也是本招的实际射程来源。"
            }),
        /** 畏缩几率：0.26 + 物攻偏移[−0.05,0.1] + 体重偏移[−0.03,0.06]；夹 0.14..0.42。 */
        flinchChance: percent(
            F.base(0.26).plus(F.stat("attack").minus(60).times(0.001).clamp(-0.05, 0.1))
                .plus(F.body("weight").minus(300).times(0.00004).clamp(-0.03, 0.06)).clamp(0.14, 0.42),
            "畏缩几率", "冰柱砸实时的畏缩几率；物攻与体重越高越容易把人砸懵。"),
        flinchTicks: ticks(15, "畏缩持续", "被砸懵的人在这段时间内无法开始新动作。"),
        /** 结冰停留：70 + 等级 ×0.6；夹 45..140；落点结出的一小片冰留着，到期原方块回来。 */
        iceTicks: seconds(
            F.base(70).plus(F.level().times(0.6)).clamp(45, 140).round(0),
            "结冰停留", "落点结出的冰面停留多久；到期原方块回来。")
    });

    defineDamage("iciclecrash", "shatter", {});

    stages("iciclecrash", [
        { level: 34, values: { shatter: 82 } },
        { level: 52, values: { shatter: 95, crackRadius: 2.3, flinchChance: 0.34 } }
    ]);

    describe("iciclecrash", [
        { key: "description.0", values: ["shatter","crackRadius"] },
        { key: "description.1", values: ["dropHeight","fallSpeed","icicleRadius"] },
        { key: "description.2", values: ["reach"] },
        { key: "description.3", values: ["flinchChance","flinchTicks"] },
        { key: "description.4", values: ["iceTicks"] },
        { key: "tall.on", values: [], when: function (context) { return read(context.detail.values, ["tall"]) === true; } },
        { key: "tall.off", values: [], when: function (context) { return read(context.detail.values, ["tall"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shatter"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.shatter", "tier.1.crackRadius", "tier.1.flinchChance"] }
    ]);
}
