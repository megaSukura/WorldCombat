/**
 * 疯狂伏特 / wildcharge 的参数与伤害段。
 *
 * 原生事实：电、物理、威力 90、命中 100、PP 15、接触、反作用力 1/4、无次要效果（Cobblemon 1.8，123 位学习者）。
 * 翻译：把「让电流覆盖全身，撞向对手进行攻击」落成一次**放电冲锋**——先把电流从全身收拢、越跑越亮，
 * 笔直撞上去；撞实的一刻把电流灌进对方身体，可能让对方麻痹；回路也顺着自己回来，全身湿透时漏电更狠。
 * 原生没有次要效果；本招把「电流灌进对方」做成概率麻痹，作为它在场上与猛撞分开的身份，写进报告说明。
 *
 * 数据分散（每项依赖不同的精灵数据与当前处境）：
 *   surge    电击威力：物攻与速度共同打底；自己湿透漏电打折、对方湿透导电加成、过载再抬一档。
 *   paralyze 麻痹概率：速度给出基础，对方湿透与过载显著提高，控流式降低。
 *   recoil   回路反噬：防御越高越轻，自己湿透额外加重，过载更重——本招最主要的自损来源。
 *   dash/pace/radius 冲程、推进与判定：速度与体型高度。
 *   shove    击退：速度与过载。
 *   spark    电火花数量：速度派生，过载加量，粒子按它发射。
 *   tempo/aftercast/recharge 起手、收招与冷却都吃速度，过载拉长起手与冷却。
 *
 * 配置 overload（过载）双向取舍：过载＝电流全开，威力、麻痹概率、击退与火花都升，但回路反噬更重、起手更长；
 * 控流＝压低威力与反噬、起手更短、麻痹概率略降。两个方向各有适用局面（速攻 vs 拼命留状态）。
 *
 * 伤害段 surge：这一撞带电的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("wildcharge", {
        /** 电击威力：基础 90，物攻每比 60 多 1 加 0.5（夹 -25..45），速度每比 60 快 1 加 0.3（夹 -12..28）；对方湿透 ×1.12、自己湿透 ×0.9、过载 ×1.08 / 控流 ×0.95；夹 60..190。 */
        surge: formula(
            F.base(90).plus(F.stat("attack").minus(60).times(0.5).clamp(-25, 45))
                .plus(F.stat("speed").minus(60).times(0.3).clamp(-12, 28))
                .times(F.when(F.target("actor.wet", text("worldcombat.skill.wildcharge.value.targetWet")), F.const(1.12), F.const(1)))
                .times(F.when(F.state("wet", text("worldcombat.skill.wildcharge.value.soaked")), F.const(0.9), F.const(1)))
                .times(F.when(F.pref("overload", text("worldcombat.skill.wildcharge.preference.overload")), F.const(1.08), F.const(0.95)))
                .clamp(60, 190).round(1),
            "电击威力", {
                unit: "威力",
                description: "带电撞上去那一下的威力；物攻越重、起步越快越猛。对方湿透时电流灌得更深，自己湿透则漏电打折，过载再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 麻痹概率：基础 0.12，速度每比 60 快 1 加 0.0015（夹 -0.04..0.10），对方湿透 +0.15，过载 +0.06 / 控流 -0.03；夹 0.05..0.5。 */
        paralyze: percent(
            F.base(0.12).plus(F.stat("speed").minus(60).times(0.0015).clamp(-0.04, 0.1))
                .plus(F.when(F.target("actor.wet", text("worldcombat.skill.wildcharge.value.targetWet")), F.const(0.15), F.const(0)))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.wildcharge.preference.overload")), F.const(0.06), F.const(-0.03)))
                .clamp(0.05, 0.5),
            "麻痹概率", "命中后把电流灌进对方、让它麻痹的机会；速度越快越容易灌透，对方湿透时大幅提高，过载再加一档，控流式降低。"),
        /** 回路反噬：基础 0.25，防御每比 60 多 1 少 0.0008（上限 -0.12），自己湿透 +0.08，过载 +0.05；夹 0.10..0.45。 */
        recoil: formula(
            F.base(0.25).minus(F.stat("defence").minus(60).times(0.0008).clamp(0, 0.12))
                .plus(F.when(F.state("wet", text("worldcombat.skill.wildcharge.value.soaked")), F.const(0.08), F.const(0)))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.wildcharge.preference.overload")), F.const(0.05), F.const(0)))
                .clamp(0.1, 0.45).round(3),
            "回路反噬", {
                unit: "比例",
                description: "命中后按实际伤害反噬自己的比例；防御越高越轻，自己湿透时漏电更狠，过载更重。这是本招最主要的自损来源。"
            }),
        /** 冲程：基础 3.4 格，速度每比 60 快 1 加 0.02（夹 -0.8..1.8），过载 +0.3；夹 2.6..6.2。 */
        dash: formula(
            F.base(3.4).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.8, 1.8))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.wildcharge.preference.overload")), F.const(0.3), F.const(0)))
                .clamp(2.6, 6.2).round(2),
            "冲程", {
                unit: "格",
                description: "从起步到刹停的总位移，也是本招的射程基准；腿快、过载的人冲得更远。"
            }),
        /** 推进速度：基础 0.95 格/刻，速度每比 60 快 1 加 0.006（夹 -0.2..0.55）；夹 0.7..1.6。 */
        pace: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.55)).clamp(0.7, 1.6).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "放电冲锋时每刻前进的距离；越快越难被侧移躲开，冲空也放得更远。"
            }),
        /** 判定半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.13；夹 0.38..0.9。 */
        radius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.13)).clamp(0.38, 0.9).round(2),
            "判定半径", {
                unit: "格",
                description: "裹在身上的电场扫过的横向判定半径；身板越大电场包得越开。"
            }),
        /** 击退：基础 0.6 格，速度每比 60 快 1 加 0.004（夹 -0.2..0.7），过载 +0.15；夹 0.3..1.6。 */
        shove: formula(
            F.base(0.6).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.2, 0.7))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.wildcharge.preference.overload")), F.const(0.15), F.const(0)))
                .clamp(0.3, 1.6).round(2),
            "击退", {
                unit: "格",
                description: "命中后把目标沿冲撞方向顶开多远；越快、过载越远。"
            }),
        /** 电火花数量：基础 22，速度每比 60 快 1 加 0.35（夹 -8..22），过载 +10；夹 16..68。 */
        spark: formula(
            F.base(22).plus(F.stat("speed").minus(60).times(0.35).clamp(-8, 22))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.wildcharge.preference.overload")), F.const(10), F.const(0)))
                .clamp(16, 68).round(0),
            "电火花数量", {
                unit: "个",
                description: "冲锋与命中迸开的电火花数量，随速度与过载增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 8 刻，速度每比 60 快 1 少 0.02（夹 -3..3），过载 +3；夹 5..15。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.wildcharge.preference.overload")), F.const(3), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "把电流收拢到全身、蓄到能撞出去的时间；速度越快越短，过载蓄得更久。"),
        /** 收招：基础 9 刻，速度每比 60 快 1 少 0.02（夹 -3..3）；夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3)).clamp(5, 14).round(0),
            "收招", "撞完或放电后的收势；速度越快越利落。"),
        /** 冷却：基础 34 刻，速度每比 60 快 1 少 0.03（夹 -5..8），过载 +8；夹 22..48。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(60).times(0.03).clamp(-5, 8))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.wildcharge.preference.overload")), F.const(8), F.const(0)))
                .clamp(22, 48).round(0),
            "冷却", "两次放电冲锋之间的间隔；速度越快回得越快，过载缓得更久。"),
        traceAhead: hidden(1.15),
        minimumMove: hidden(0.05)
    });

    defineDamage("wildcharge", "surge", {}, { contact: true });

    stages("wildcharge", [
        { level: 34, values: { surge: 104 } },
        { level: 54, values: { surge: 126, paralyze: 0.16 } }
    ]);

    describe("wildcharge", [
        { key: "description.0", values: ["surge","dash","pace","radius"] },
        { key: "description.1", values: ["paralyze","recoil","shove"] },
        { key: "description.2", values: [] },
        { key: "overload.on", values: [], when: function (context) { return read(context.detail.values, ["overload"]) === true; } },
        { key: "overload.off", values: [], when: function (context) { return read(context.detail.values, ["overload"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.surge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.surge", "tier.1.paralyze"] }
    ]);
}
