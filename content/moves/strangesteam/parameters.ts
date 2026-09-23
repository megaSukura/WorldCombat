/**
 * 神奇蒸汽 / strangesteam —— 参数与伤害段。
 *
 * 原生事实：Fairy／特殊／威力 90／命中 95／PP 10／单体；20% 概率使目标混乱（Cobblemon 1.8 / Showdown，
 * 描述作 "attacks the target by emitting steam"）。
 *
 * 翻译：把「喷出烟雾」落成一片**会停留的迷幻蒸汽云**——施法者朝选定地点喷出一柱滚烫蒸汽，蒸汽在落点散成
 * 一片低垂的云；云里的人在第一次被喷到时挨一下烫伤并可能看得恍惚，留在云里会被蒸汽持续熏着、恍惚被不断续上。
 * 它是本族唯一留下一片区域、影响后来者的成员；与烟幕（只降命中不造成伤害）分开，与毒瓦斯（上毒/可燃）分开。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   scald        首喷威力：特攻定蒸汽温度，等级让喷流更猛。
 *   sear         续熏威力：特攻与等级决定留在云里每次被熏掉多少。
 *   reach        喷射距离：特攻决定蒸汽能送多远。
 *   radius       云半径：特攻与身高决定蒸汽摊开多大。
 *   confuseChance 迷幻概率：原生 20% 起，特攻提高，浓雾更高。
 *   dazeTicks    迷幻时长：特攻与等级决定蒸汽看得多久，浓雾更长。
 *   fumble       失手率：迷幻期间每次想出手被打散的概率，存进载体振幅。
 *   cloudTicks   云停留：等级决定蒸汽留多久，浓雾更久。
 *   motes        汽点数量：特攻与等级派生，驱动画面密度。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `dense`（浓雾）双向取舍：开启＝云更大更久、迷幻概率更高时长更长，但首喷威力 ×0.85；关闭（喷发）＝
 * 云更小更短、首喷 ×1.12、蒸汽更冲，代价是区域与持续更小，适合补一发就走。
 *
 * 迷幻行为（本单元自己的变体）：目标每次想出手都可能被打散；留在云里，恍惚会被持续续上（走出云外按自己的
 * 时间走完）。这是神奇蒸汽区别于攀岩（踉跄）、信号光束（挨打反冲）的地方。
 *
 * 两段伤害：`scald`（首喷，随精灵数据变化）与 `sear`（续熏，较轻），都走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    export const strangesteamId = "strangesteam";
    export const strangesteamScene = "world_combat:move_strangesteam";
    export const strangesteamEffect = "world_combat:strangesteam_haze";
    export const strangesteamField = "world_combat:field/strangesteam";
    export const strangesteamCloudText = "world_combat.move.strangesteam.text.cloud";
    export const strangesteamDazeText = "world_combat.move.strangesteam.text.daze";

    actionParameters.define(strangesteamId, {
        /** 首喷威力：88 + 特攻偏移[−12,30] + 等级(≥26)偏移[0,10]，浓雾 ×0.85／喷发 ×1.12；夹 46..150。 */
        scald: formula(
            F.base(88)
                .plus(F.stat("specialAttack").minus(56).times(0.28).clamp(-12, 30))
                .plus(F.level().minus(26).times(0.4).clamp(0, 10))
                .times(F.when(F.pref("dense"), F.const(0.85), F.const(1.12)))
                .clamp(46, 150).round(1),
            "首喷威力", {
                unit: "威力",
                description: "蒸汽第一次喷到目标身上那一下的基础威力；特攻越高蒸汽越烫，喷发模式更冲。对手特防、相性与暴击在命中时另算。"
            }),
        /** 续熏威力：14 + 特攻偏移[0,10] + 等级(≥26)偏移[0,6]，浓雾 ×0.8；夹 8..32。 */
        sear: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(56).times(0.1).clamp(0, 10))
                .plus(F.level().minus(26).times(0.15).clamp(0, 6))
                .times(F.when(F.pref("dense"), F.const(0.8), F.const(1)))
                .clamp(8, 32).round(1),
            "续熏威力", {
                unit: "威力",
                description: "留在蒸汽云里每隔一段时间被熏一下的基础威力；特攻与等级越高越烫。它让云成为持续威胁，而不只是一次命中。"
            }),
        /** 喷射距离：8 + 特攻偏移[−1.5,4]；夹 5..13。 */
        reach: formula(
            F.base(8)
                .plus(F.stat("specialAttack").minus(56).times(0.05).clamp(-1.5, 4))
                .clamp(5, 13).round(2),
            "喷射距离", {
                unit: "格",
                description: "蒸汽能喷到多远；特攻越高越远。它也是本招的实际射程来源。"
            }),
        /** 云半径：1.8 + 特攻偏移[−0.4,1.4] + 身高偏移[−0.1,0.4]，浓雾 ×1.3／喷发 ×0.85；夹 1.2..4.2。 */
        radius: formula(
            F.base(1.8)
                .plus(F.stat("specialAttack").minus(56).times(0.05).clamp(-0.4, 1.4))
                .plus(F.body("height").minus(1.4).times(0.25).clamp(-0.1, 0.4))
                .times(F.when(F.pref("dense"), F.const(1.3), F.const(0.85)))
                .clamp(1.2, 4.2).round(2),
            "云半径", {
                unit: "格",
                description: "蒸汽摊开的云半径（判定与画面同一个范围）；特攻越高、体型越高越大，浓雾更广。"
            }),
        /** 迷幻概率：20% + 特攻偏移[−5%,12%]，浓雾 ×1.25；夹 12%..46%。 */
        confuseChance: percent(
            F.base(0.20)
                .plus(F.stat("specialAttack").minus(56).times(0.0014).clamp(-0.05, 0.12))
                .times(F.when(F.pref("dense"), F.const(1.25), F.const(1)))
                .clamp(0.12, 0.46).round(3),
            "迷幻概率", "被蒸汽迷得恍惚的概率；原生 20% 起，特攻越高越容易，浓雾更高。"),
        /** 迷幻时长：140 + 特攻偏移[−20,60] + 等级(≥26)偏移[0,50] 刻，浓雾 ×1.2；夹 100..340。 */
        dazeTicks: seconds(
            F.base(140)
                .plus(F.stat("specialAttack").minus(56).times(0.4).clamp(-20, 60))
                .plus(F.level().minus(26).times(1.2).clamp(0, 50))
                .times(F.when(F.pref("dense"), F.const(1.2), F.const(1)))
                .clamp(100, 340).round(0),
            "迷幻时长", "蒸汽迷得目标恍惚多久；特攻越高、等级越高越久，浓雾更长。留在云里会被续上。"),
        /** 失手率：30% + 特攻偏移[−5%,10%]；夹 18%..48%。 */
        fumble: percent(
            F.base(0.30)
                .plus(F.stat("specialAttack").minus(56).times(0.0012).clamp(-0.05, 0.1))
                .clamp(0.18, 0.48).round(3),
            "迷幻失手率", "恍惚期间目标每次想出手被打散的概率；特攻越高的施法者迷得越乱。"),
        /** 云停留：130 + 等级(≥26)偏移[0,60] 刻，浓雾 ×1.4／喷发 ×0.7；夹 80..300。 */
        cloudTicks: seconds(
            F.base(130)
                .plus(F.level().minus(26).times(1.5).clamp(0, 60))
                .times(F.when(F.pref("dense"), F.const(1.4), F.const(0.7)))
                .clamp(80, 300).round(0),
            "云停留", "蒸汽云在场地上停留多久；等级越高留得越久，浓雾更久、喷发更短。"),
        /** 汽点数量：16 + 特攻偏移[0,22] + 等级(≥26)偏移[0,10]；夹 14..48。 */
        motes: formula(
            F.base(16)
                .plus(F.stat("specialAttack").minus(56).times(0.16).clamp(0, 22))
                .plus(F.level().minus(26).times(0.3).clamp(0, 10))
                .clamp(14, 48).round(0),
            "汽点数量", {
                unit: "点",
                description: "蒸汽云里翻滚的汽点数量，随特攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：12 − 速度偏移[−2.5,3]；夹 7..17。 */
        tempo: seconds(
            F.base(12)
                .minus(F.stat("speed").minus(58).times(0.035).clamp(-2.5, 3))
                .clamp(7, 17).round(0),
            "起手", "在气孔里攒足蒸汽再喷出的时间；速度越快越短。"),
        /** 收招：9 − 速度偏移[−1.5,2.5]；夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(58).times(0.02).clamp(-1.5, 2.5)).clamp(5, 14).round(0),
            "收招", "喷完一柱蒸汽后的收势；速度越快越利落。"),
        /** 冷却：30 − 速度偏移[−5,8]；夹 18..46。 */
        recharge: seconds(
            F.base(30)
                .minus(F.stat("speed").minus(58).times(0.05).clamp(-5, 8))
                .clamp(18, 46).round(0),
            "冷却", "再次喷出蒸汽前的等待；速度越快回得越快。"),
        /** 单次云最多同时熏几个人：协议常量。 */
        maxTargets: hidden(4)
    });

    defineDamage(strangesteamId, "scald", {});
    defineDamage(strangesteamId, "sear", {});

    stages(strangesteamId, [
        { level: 34, values: { scald: 96 } },
        { level: 50, values: { scald: 106, confuseChance: 0.28, cloudTicks: 170 } }
    ]);

    describe(strangesteamId, [
        { key: "description.0", values: ["scald", "radius", "reach"] },
        { key: "description.1", values: ["sear", "cloudTicks"] },
        { key: "description.2", values: ["confuseChance", "dazeTicks", "fumble"] },
        { key: "dense.on", values: [], when: function (context) { return read(context.detail.values, ["dense"]) === true; } },
        { key: "dense.off", values: [], when: function (context) { return read(context.detail.values, ["dense"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.scald"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.scald", "tier.1.confuseChance", "tier.1.cloudTicks"] }
    ]);
}
