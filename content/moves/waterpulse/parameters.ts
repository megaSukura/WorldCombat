/**
 * 水之波动 / waterpulse 的参数与伤害段。
 *
 * 原生事实：Water、特殊、威力 60、命中 100、PP 20、pulse／distance、目标单体，
 *   命中后 20% 概率使目标混乱（Cobblemon 1.8 / Showdown），全招 268 位学习者。
 *
 * 翻译：把「用水的震动攻击」落成一枚会嗡鸣的水珠——它飞到目标身上炸开，随后水波从落点
 * 一圈圈荡开，每一圈扫过的人各吃一记回响；被震到的人耳中嗡响、脚下发飘，可能陷入混乱。
 * 扔掉的是「一次判定」：这里把 20% 混乱和范围回响都摊进几圈真实扩散的水波里，水波扫到谁
 * 就算谁，玩家从一圈圈水环读出「谁会被扫到、还剩几圈」。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   resonance  波鸣威力：特攻定水的压强，等级让震动更绵长。
 *   echo       回响威力：波圈扫过旁人那一下，由特攻决定。
 *   blast      振鸣半径：身高决定水波摊多开，特攻高的个体推得更远。
 *   velocity   水波速度：速度决定水珠飞得多急。
 *   radius     水珠半径：体型高度决定珠子大小。
 *   reach      射程：特攻决定能把水波送到多远。
 *   pulses     波圈数：速度决定荡出几圈；圈数同时驱动表现里的水环数量。
 *   interval   波间隔：速度决定水波一圈接一圈有多紧。
 *   dazeTicks  混乱时长：特攻与等级决定耳鸣持续多久。
 *   chance     混乱概率：原生 20% 起，特攻与等级提高咬住的机会。
 *   fumble     耳鸣失手率：混乱期间每次想出手被打散的概率，特攻越高越晕。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `resonant`（共振式）双向取舍：开启＝振鸣半径 ×1.25、混乱更久更易触发、单发威力略减、
 * 水波更慢、射程 −2、冷却 +6；关闭（点振式）＝更紧更快更重的一发，代价是范围与耳鸣都收窄。
 *
 * 伤害段 `resonance`（主目标）与 `echo`（波圈旁人）走共享换算，原生类别 Special。
 */
namespace PokemonSkills {
    actionParameters.define("waterpulse", {
        resonance: formula(
            F.base(60).plus(F.stat("specialAttack").minus(55).times(0.26).clamp(-14, 34))
                .plus(F.level().minus(28).times(0.5).clamp(0, 12))
                .times(F.when(F.pref("resonant", text("worldcombat.skill.waterpulse.preference.resonant")), F.const(0.94), F.const(1)))
                .clamp(40, 132).round(1),
            "波鸣威力", {
                unit: "威力",
                description: "水珠正中目标那一下的基础威力；特攻越高水压越足，等级让震动更绵长，共振式把能量摊到更宽的波面上。对手特防、相性与暴击在命中时另算。"
            }),
        echo: formula(
            F.base(24).plus(F.stat("specialAttack").minus(55).times(0.11).clamp(-5, 15))
                .clamp(16, 46).round(1),
            "回响威力", {
                unit: "威力",
                description: "水波一圈圈荡开时扫过旁人那一下的威力；特攻越高回响越重。"
            }),
        blast: formula(
            F.base(2.4).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 1.0))
                .plus(F.stat("specialAttack").minus(55).times(0.004).clamp(-0.2, 0.6))
                .times(F.when(F.pref("resonant", text("worldcombat.skill.waterpulse.preference.resonant")), F.const(1.25), F.const(1)))
                .clamp(1.8, 4.2).round(2),
            "振鸣半径", {
                unit: "格",
                description: "水波最终荡开到的半径，也是回响的判定范围；大个子、特攻高、共振式摊得更开。画面里最外圈水环就是它。"
            }),
        velocity: formula(
            F.base(1.15).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.5))
                .times(F.when(F.pref("resonant", text("worldcombat.skill.waterpulse.preference.resonant")), F.const(0.85), F.const(1)))
                .clamp(0.85, 1.7).round(2),
            "水波速度", {
                unit: "格/刻",
                description: "水珠飞行的速度；速度快的个体掷得更急，目标更难走位躲开。共振式更沉、飞得更慢。"
            }),
        radius: formula(
            F.base(0.22).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.03, 0.12)).clamp(0.18, 0.4).round(2),
            "水珠半径", {
                unit: "格",
                description: "飞行途中的判定半径；体型越高水珠越大。"
            }),
        reach: formula(
            F.base(13).plus(F.stat("specialAttack").minus(55).times(0.05).clamp(-1.5, 4))
                .minus(F.when(F.pref("resonant", text("worldcombat.skill.waterpulse.preference.resonant")), F.const(2), F.const(0)))
                .clamp(10, 19).round(1),
            "射程", {
                unit: "格",
                description: "水珠能把嗡鸣送到多远；特攻高打得远，共振式更重所以更近。它也是本招的实际射程来源。"
            }),
        pulses: formula(
            F.base(3).plus(F.stat("speed").minus(55).times(0.02).clamp(0, 2.2)).clamp(2, 6).round(0),
            "波圈数", {
                unit: "圈",
                description: "水波从落点荡出的圈数；速度越快荡得越多圈。表现里的水环数量与它一致。"
            }),
        interval: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("resonant", text("worldcombat.skill.waterpulse.preference.resonant")), F.const(1), F.const(0)))
                .clamp(3, 9).round(0),
            "波间隔", "两圈水波之间隔多久；速度越快荡得越紧，共振式慢一点。"),
        dazeTicks: seconds(
            F.base(180).plus(F.stat("specialAttack").minus(55).times(0.4).clamp(-20, 60))
                .plus(F.level().minus(30).times(1).clamp(0, 40))
                .times(F.when(F.pref("resonant", text("worldcombat.skill.waterpulse.preference.resonant")), F.const(1.2), F.const(1)))
                .clamp(120, 340).round(0),
            "混乱时长", "被震得耳鸣后陷入混乱的时长；特攻越高、等级越高响得越久，共振式更长。"),
        chance: percent(
            F.base(0.20).plus(F.stat("specialAttack").minus(55).times(0.0016).clamp(-0.05, 0.12))
                .plus(F.level().minus(25).times(0.0012).clamp(0, 0.06))
                .plus(F.when(F.pref("resonant", text("worldcombat.skill.waterpulse.preference.resonant")), F.const(0.06), F.const(0)))
                .clamp(0.12, 0.4).round(3),
            "混乱概率", "水波震到目标时让它陷入混乱的概率；原生 20% 起，特攻与等级越高越容易咬住，共振式更容易。"),
        fumble: percent(
            F.base(0.32).plus(F.stat("specialAttack").minus(55).times(0.0012).clamp(-0.05, 0.1))
                .plus(F.when(F.pref("resonant", text("worldcombat.skill.waterpulse.preference.resonant")), F.const(0.04), F.const(0)))
                .clamp(0.2, 0.5).round(3),
            "耳鸣失手率", "混乱期间目标每次想出手被打散的概率；特攻越高的施法者震得越晕，共振式更乱。"),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3)).clamp(6, 16).round(0),
            "起手", "把水压成嗡鸣的水珠再掷出的时间；速度越快越短。"),
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2)).clamp(5, 12).round(0),
            "收招", "水波散尽后站稳的收势；速度越快越利落。"),
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("resonant", text("worldcombat.skill.waterpulse.preference.resonant")), F.const(6), F.const(0)))
                .clamp(22, 52).round(0),
            "冷却", "再次聚水嗡鸣前的等待；速度越快回得越快，共振式蓄得更久。")
    });

    stages("waterpulse", [
        { level: 30, values: { resonance: 68, blast: 2.7 } },
        { level: 48, values: { resonance: 76, pulses: 4, dazeTicks: 220 } }
    ]);

    defineDamage("waterpulse", "resonance", {}, { pulse: true });
    defineDamage("waterpulse", "echo", {}, { pulse: true });

    describe("waterpulse", [
        { key: "description.0", values: ["resonance","blast","pulses","interval"] },
        { key: "description.1", values: ["echo"] },
        { key: "description.2", values: ["chance","dazeTicks","fumble"] },
        { key: "resonant.on", values: [], when: function (context) { return read(context.detail.values, ["resonant"]) === true; } },
        { key: "resonant.off", values: [], when: function (context) { return read(context.detail.values, ["resonant"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.resonance", "tier.0.blast"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.resonance", "tier.1.pulses", "tier.1.dazeTicks"] }
    ]);
}
