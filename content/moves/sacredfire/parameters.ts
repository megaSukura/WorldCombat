/**
 * 神圣之火 / sacredfire 的参数与伤害段。
 *
 * 原生事实：Fire／物理／威力 100／命中 95／PP 5／50% 灼伤／defrost（Cobblemon 1.8 / Showdown），
 *   全招 1 位学习者（凤王 Ho-Oh）。
 *
 * 翻译：把「用神秘的火焰烧尽对手」落成一次**裹着虹彩圣火的俯冲**——施法者被彩虹色的火裹住、腾空压向
 * 目标，撞上去是实打实的一记物理重击；这一击极难点不着（原生 50%），而且圣火压过冰霜（defrost 解冻自身）。
 * 它和同族最不同的地方是「近身」：火花／喷射火焰／大字爆炎都是远程火，只有神圣之火是施法者本人
 * 化作一团彩火撞过去。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   strike     撞击威力：物攻定这一击有多重，等级给成长；天罚式更重。
 *   pace       俯冲速度：速度决定冲得多急。
 *   sprint     俯冲距离：速度决定能扑多远。
 *   radius     判定半径：体型高度决定彩火包多大的身。
 *   push       击退：速度决定撞开多远。
 *   burnChance 点燃概率：原生 50% 起，物攻提高；天罚式压低换威力。
 *   flame      落点余焰每跳威力：物攻派生（仅圣火式）。
 *   flameRadius/flameTicks/flamePulse 余焰范围、时长与间隔（读物攻与等级）。
 *   sparks     火星数：物攻与等级派生，表现按它发射。
 *   tempo/aftercast/recharge：速度决定起手与冷却。
 *
 * 配置 `smite`（天罚式）双向取舍：开启＝撞击威力 ×1.15、击退更强、冷却更短，但点燃概率 ×0.55 且落点不留余焰；
 * 关闭（圣火式）＝点燃概率拉满、落点留下一片虹彩余焰反复烫人，代价是威力略低、冷却更久——两向分别对应点杀与封地。
 *
 * 伤害段 `strike`（撞击）与 `flame`（余焰）各自成段；`strike` 带 contact 标记，灼伤经 `impact` 的
 * `status: "burn"` 落到任何目标上。
 */
namespace PokemonSkills {
    actionParameters.define("sacredfire", {
        /** 撞击威力：100 + 物攻偏移[−18,44] + 等级(≥30)偏移[0,12]；天罚 ×1.15；夹 70..200。 */
        strike: formula(
            F.base(100).plus(F.stat("attack").minus(60).times(0.35).clamp(-18, 44))
                .plus(F.level().minus(30).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("smite", text("worldcombat.skill.sacredfire.preference.smite")), F.const(1.15), F.const(1)))
                .clamp(70, 200).round(1),
            "撞击威力", {
                unit: "威力",
                description: "裹着圣火撞上去那一下的威力；物攻越高越重、等级越高越经烧，天罚式再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 俯冲速度：1.15 + 速度偏移[−0.25,0.55]；夹 0.9..1.7。 */
        pace: formula(
            F.base(1.15).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.25, 0.55)).clamp(0.9, 1.7).round(2),
            "俯冲速度", {
                unit: "格/刻",
                description: "俯冲时每刻移动的距离；越快越难被侧移躲开。"
            }),
        /** 俯冲距离：4.6 + 速度偏移[−1.2,2.4]；夹 3.4..7。 */
        sprint: formula(
            F.base(4.6).plus(F.stat("speed").minus(60).times(0.024).clamp(-1.2, 2.4)).clamp(3.4, 7).round(2),
            "俯冲距离", {
                unit: "格",
                description: "一口气扑出的距离；腿快的个体够得到更远的对手。它同时是本招的射程基准。"
            }),
        /** 判定半径：0.7 + 高度偏移[−0.1,0.5]；夹 0.55..1.2。 */
        radius: formula(
            F.base(0.7).plus(F.body("height").minus(1.4).times(0.15).clamp(-0.1, 0.5)).clamp(0.55, 1.2).round(2),
            "判定半径", {
                unit: "格",
                description: "包在身上的虹彩火焰半径，也是俯冲的横向判定半径；身板越大包得越开。"
            }),
        /** 击退：0.45 + 速度偏移[−0.15,0.35]；夹 0.3..0.85。 */
        push: formula(
            F.base(0.45).plus(F.stat("speed").minus(60).times(0.003).clamp(-0.15, 0.35)).clamp(0.3, 0.85).round(2),
            "击退", {
                unit: "格",
                description: "撞中后把目标带开的方向偏移；冲得快的个体推得更远。"
            }),
        /** 点燃概率：0.50 + 物攻偏移[−0.05,0.12]；天罚 ×0.55；夹 0.25..0.68。 */
        burnChance: percent(
            F.base(0.50).plus(F.stat("attack").minus(60).times(0.001).clamp(-0.05, 0.12))
                .times(F.when(F.pref("smite", text("worldcombat.skill.sacredfire.preference.smite")), F.const(0.55), F.const(1)))
                .clamp(0.25, 0.68).round(3),
            "点燃概率", "命中的圣火把目标点着的概率；原生 50% 起，物攻越高越容易，天罚式压低换威力。"),
        /** 余焰威力：15 + 物攻偏移[−4,12]；夹 8..30（仅圣火式）。 */
        flame: formula(
            F.base(15).plus(F.stat("attack").minus(60).times(0.05).clamp(-4, 12)).clamp(8, 30).round(1),
            "余焰威力", {
                unit: "威力",
                description: "圣火式落在撞击点的虹彩余焰每跳对圈内每人造成的伤害；踩在还烧着的地上就会再挨。"
            }),
        /** 余焰范围：2.0 + 物攻偏移[−0.3,0.8]；夹 1.4..3.2（仅圣火式）。 */
        flameRadius: formula(
            F.base(2.0).plus(F.stat("attack").minus(60).times(0.008).clamp(-0.3, 0.8)).clamp(1.4, 3.2).round(2),
            "余焰范围", {
                unit: "格",
                description: "圣火式留在撞击点的虹彩余焰有多大；站在里面的人会被反复烫到。"
            }),
        /** 余焰时长：70 + 等级(≥30)偏移[0,30]；夹 50..110（仅圣火式）。 */
        flameTicks: seconds(
            F.base(70).plus(F.level().minus(30).times(0.8).clamp(0, 30)).clamp(50, 110).round(0),
            "余焰时长", "圣火式留下的虹彩余焰在地上烧多久；这段时间里站在圈内会反复挨烫。"),
        /** 余焰间隔：10 − 速度偏移[−2,3]；夹 7..15（仅圣火式）。 */
        flamePulse: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3)).clamp(7, 15).round(0),
            "余焰间隔", "虹彩余焰两跳之间隔多久；速度快的个体烫得更密。"),
        /** 火星数：24 + 物攻偏移[−6,30] + 等级(≥30)偏移[0,16]；夹 16..64。 */
        sparks: formula(
            F.base(24).plus(F.stat("attack").minus(60).times(0.3).clamp(-6, 30))
                .plus(F.level().minus(30).times(0.5).clamp(0, 16))
                .clamp(16, 64).round(0),
            "彩虹火星", {
                unit: "个",
                description: "俯冲与撞击扬起的虹彩火星数量，随物攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.025).clamp(-2, 2.5)).clamp(7, 14).round(0),
            "起手", "圣火从脚下升起来裹住全身、腾空压向目标前的时间；速度越快越干脆。"),
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2)).clamp(5, 13).round(0),
            "收招", "俯冲后的收势；速度越快越利落。"),
        recharge: seconds(
            F.base(44).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("smite", text("worldcombat.skill.sacredfire.preference.smite")), F.const(-6), F.const(8)))
                .clamp(28, 58).round(0),
            "冷却", "再次俯冲前的间隔；速度越快回得越快，圣火式蓄得更久、天罚式更快。"),
        maxTargets: hidden(6),
        traceAhead: hidden(1.3),
        minimumMove: hidden(0.05)
    });

    defineDamage("sacredfire", "strike", {}, { contact: true });
    defineDamage("sacredfire", "flame", {});

    stages("sacredfire", [
        { level: 43, values: { strike: 116, sparks: 34 } },
        { level: 60, values: { strike: 130, burnChance: 0.56, sparks: 44 } }
    ]);

    describe("sacredfire", [
        { key: "description.0", values: ["strike", "sprint", "pace"] },
        { key: "description.1", values: ["radius","push","burnChance"] },
        { key: "description.2", values: ["flame","flameRadius","flameTicks","flamePulse","maxTargets"] },
        { key: "description.3", values: [] },
        { key: "smite.on", values: [], when: function (context) { return read(context.detail.values, ["smite"]) === true; } },
        { key: "smite.off", values: [], when: function (context) { return read(context.detail.values, ["smite"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.strike"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.strike", "tier.1.burnChance"] }
    ]);
}
