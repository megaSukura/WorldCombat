/**
 * 大字爆炎 / fireblast 的参数与伤害段。
 *
 * 原生事实：Fire／特殊／威力 110／命中 85／PP 5／10% 灼伤（Cobblemon 1.8 / Showdown），178 位学习者。
 *
 * 翻译：把「用大字形状的火焰烧尽对手」照字面落成**在空中烧出一个「大」字**——火先写一横，再顺两撇、
 * 两捺把字补全，三笔依次点亮；字成形的一瞬整个崩开砸在字心，把对手烧穿。原生的 85 命中在这里是
 * **这一笔写得正不正**：字心相对瞄准点会偏一点，偏远了就只擦到边。刻印式让这个字留在地上继续闷烧，
 * 站在字痕上的人会反复挨烫；爆燃式只崩一记更重的。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   blast      崩字威力：特攻定火有多烈，等级给成长；刻印式摊薄、爆燃式加重。
 *   mark       字痕每跳威力：特攻派生（仅刻印式）。
 *   glyph      字的大小：特攻与体型共同决定。
 *   radius     崩开范围：特攻与体型高度决定。
 *   scatter    写偏距离：替代原生 85 命中，特攻越高写得越正。
 *   strokeGap  三笔之间：速度决定写得快不快。
 *   burnChance 点燃概率：原生 10% 起，特攻与等级提高。
 *   sparks     崩字火星：特攻与等级派生，表现按它发射。
 *   markRadius/markTicks 字痕范围与时长（仅刻印式，读等级）。
 *   tempo/aftercast/recharge：速度决定起手与冷却。
 *
 * 配置 `inscribe`（刻印式）双向取舍：开启＝崩字威力 ×0.85，但字痕在地上留一段时间反复烫人，冷却更久；
 * 关闭（爆燃式）＝威力 ×1.15、单体一记更重、冷却更短，代价是字不留痕——两向分别对应封地与爆发。
 *
 * 伤害段 `blast`（崩字）与 `mark`（字痕）各自成段；灼伤经 `hurt` 的 `status: "burn"` 落到任何目标上。
 */
namespace PokemonSkills {
    actionParameters.define("fireblast", {
        /** 崩字威力：110 + 特攻偏移[−18,50] + 等级(≥30)偏移[0,14]；刻印 ×0.85、爆燃 ×1.15；夹 70..210。 */
        blast: formula(
            F.base(110).plus(F.stat("specialAttack").minus(50).times(0.4).clamp(-18, 50))
                .plus(F.level().minus(30).times(0.5).clamp(0, 14))
                .times(F.when(F.pref("inscribe", text("worldcombat.skill.fireblast.preference.inscribe")), F.const(0.85), F.const(1.15)))
                .clamp(70, 210).round(1),
            "崩字威力", {
                unit: "威力",
                description: "字成形崩开时对字心周围每个人结算的威力；特攻越高越烈、等级越高越经烧，爆燃式更重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 字痕威力：16 + 特攻偏移[−4,14]；夹 8..34（仅刻印式）。 */
        mark: formula(
            F.base(16).plus(F.stat("specialAttack").minus(50).times(0.06).clamp(-4, 14)).clamp(8, 34).round(1),
            "字痕威力", {
                unit: "威力",
                description: "刻印式留下的字痕每跳一次对站在上面的人造成的伤害；踩在还在烧的笔迹上就会再挨。"
            }),
        /** 字的大小：2.2 + 特攻偏移[−0.3,0.9] + 高度偏移[−0.3,0.9]；夹 1.6..3.6。 */
        glyph: formula(
            F.base(2.2).plus(F.stat("specialAttack").minus(50).times(0.006).clamp(-0.3, 0.9))
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.3, 0.9))
                .clamp(1.6, 3.6).round(2),
            "字的大小", {
                unit: "格",
                description: "空中的「大」字有多大；特攻高、体型大的个体写得更大。它同时决定三笔的长度与画面尺度。"
            }),
        /** 崩开范围：1.8 + 特攻偏移[−0.3,0.9] + 高度偏移[−0.3,1.1]；夹 1.3..3.4。 */
        radius: formula(
            F.base(1.8).plus(F.stat("specialAttack").minus(50).times(0.01).clamp(-0.3, 0.9))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.1))
                .clamp(1.3, 3.4).round(2),
            "崩开范围", {
                unit: "格",
                description: "字崩开时火与冲击罩到多大一圈；特攻高、体型大的个体崩得更开。"
            }),
        /** 写偏距离：1.5 − 特攻偏移[−0.5,0.6]；夹 0.6..2.6。 */
        scatter: formula(
            F.base(1.5).minus(F.stat("specialAttack").minus(50).times(0.004).clamp(-0.5, 0.6)).clamp(0.6, 2.6).round(2),
            "写偏距离", {
                unit: "格",
                description: "字心相对瞄准点随机的最大偏移，替代原生的 85 命中；特攻越高这一笔写得越正。"
            }),
        /** 三笔间隔：4 − 速度偏移[−1,1.5]；夹 2..7。 */
        strokeGap: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(2, 7).round(0),
            "三笔间隔", "在上一笔与下一笔之间的时间；速度快的个体写得越急。"),
        /** 点燃概率：0.10 + 特攻偏移[−0.03,0.07] + 等级(≥30)偏移[0,0.05]；夹 0.06..0.26。 */
        burnChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(50).times(0.0012).clamp(-0.03, 0.07))
                .plus(F.level().minus(30).times(0.0008).clamp(0, 0.05))
                .clamp(0.06, 0.26).round(3),
            "点燃概率", "被崩开的字烧到的目标陷入灼伤的概率；特攻越高、等级越高越容易点着。"),
        /** 崩字火星：26 + 特攻偏移[−8,44] + 等级(≥30)偏移[0,20]；夹 18..80。 */
        sparks: formula(
            F.base(26).plus(F.stat("specialAttack").minus(50).times(0.4).clamp(-8, 44))
                .plus(F.level().minus(30).times(0.6).clamp(0, 20))
                .clamp(18, 80).round(0),
            "崩字火星", {
                unit: "个",
                description: "字崩开时迸出的火星数量，也驱动表现的密度；特攻与等级越高越碎。"
            }),
        /** 字痕范围：1.6 + 特攻偏移[−0.3,0.8]；夹 1.2..2.8（仅刻印式）。 */
        markRadius: formula(
            F.base(1.6).plus(F.stat("specialAttack").minus(50).times(0.012).clamp(-0.3, 0.8)).clamp(1.2, 2.8).round(2),
            "字痕范围", {
                unit: "格",
                description: "刻印式留在地上的字痕有多大；站在里面的人会被反复烫到。"
            }),
        /** 字痕时长：80 + 等级(≥30)偏移[0,30]；夹 60..120（仅刻印式）。 */
        markTicks: seconds(
            F.base(80).plus(F.level().minus(30).times(1.2).clamp(0, 30)).clamp(60, 120).round(0),
            "字痕时长", "刻印式留下的字痕在地上烧多久；这段时间里站在字痕上会反复挨烫。"),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 2.5)).clamp(9, 16).round(0),
            "起手", "把火攒到能写字前的时间；速度越快越短。"),
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2)).clamp(6, 14).round(0),
            "收招", "写完字收势的时间；速度越快越利落。"),
        recharge: seconds(
            F.base(44).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("inscribe", text("worldcombat.skill.fireblast.preference.inscribe")), F.const(10), F.const(0)))
                .clamp(30, 60).round(0),
            "冷却", "再写一个大字前的等待；速度越快回得越快，刻印式蓄得更久。"),
        markPulse: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 3)).clamp(8, 16).round(0),
            "字痕间隔", "刻印式字痕两跳之间隔多久；速度快的个体烫得更密。"),
        maxTargets: hidden(7)
    });

    defineDamage("fireblast", "blast", {});
    defineDamage("fireblast", "mark", {});

    stages("fireblast", [
        { level: 43, values: { blast: 132, glyph: 2.5 } },
        { level: 60, values: { blast: 148, glyph: 2.8, radius: 2.3 } }
    ]);

    describe("fireblast", [
        { key: "description.0", values: ["blast", "radius", "glyph"] },
        { key: "description.1", values: ["scatter", "strokeGap", "burnChance"] },
        { key: "description.2", values: ["mark", "markRadius", "markTicks", "markPulse"] },
        { key: "inscribe.on", values: [], when: function (context) { return read(context.detail.values, ["inscribe"]) === true; } },
        { key: "inscribe.off", values: [], when: function (context) { return read(context.detail.values, ["inscribe"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.glyph"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blast", "tier.1.glyph", "tier.1.radius"] }
    ]);
}
