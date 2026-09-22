/**
 * 骨棒乱打 / bonerush —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**地面**／物理／威力 25／命中 90／PP 10／**非接触**（没有 `contact` 标记）／单体／
 *   连续 2～5 次（`multihit: [2, 5]`）。描述「用坚硬的骨头殴打对手进行攻击，连续攻击2～5次」，仅 4 位学习者
 *   （卡拉卡拉一族与路卡利欧等），是本组最稀有的一招。
 *
 * 翻译：把「用硬骨连续殴打」落成**掷骨夯地**——施法者把手里的硬骨一下下抛出去，夯在目标脚下的地面上；冲击沿
 *   地层钻到对手脚底，所以是地面属性、**不接触**。每一击都把落点那层地表震裂，最后一下最重。它是本族唯一
 *   把骨头离手、并且在地面留下裂痕的招。
 *   与同族分开：乱抓会绕圈换位、乱击是站定定点突刺、扫尾拍打是原地整圈旋尾；只有骨棒乱打隔着距离落下、留下地痕。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   quake      每击威力：物攻定夯得多沉、等级定骨头的硬度；裂地式略轻、重夯式更重。
 *   strikes    击数：物攻定收骨的快慢、等级定耐力，决定这一串最多夯几下（裂地式收在 3、重夯式可到 5）。
 *   shock      震波半径：体重定砸下去的地动有多大、等级定传得远；裂地式更大、重夯式更集中。
 *   throwRange 掷距：等级与速度决定骨头能扔多远，也是本招的实际射程来源。
 *   flight     骨速：速度决定扔得多快；等级略增。
 *   boomArc    弧坠：体重定骨头砸下来的弧有多陡；等级略增。
 *   crack      裂痕时长：等级决定地痕留多久；裂地式留得更久。
 *   finish     末击倍率：等级决定最后一下重多少。
 *   lift       挑起：物攻决定冲击把目标顶起多高。
 *   boneRadius 骨判定：身高决定一根骨头的碰撞大小。
 *   gap        击间隔：速度决定夯得多密。
 *   accuracy   每击命中率：速度提高它（原生 90% 起）。
 *   dust       扬尘数量：物攻换算的碎石量，直接驱动发射数量。
 *   tempo／settle／recharge：速度与等级定起手、收招与冷却。
 *
 * 配置 `fissure`（裂地式）双向取舍（默认关，即重夯式）：
 *   开（裂地）＝震波半径 ×1.3、裂痕时长 ×1.5（地面留痕更久），代价是每击 ×0.85、击数上限收在 3、骨速 ×0.92。
 *     适用：对一群目标、或想用持久地痕占住战场。
 *   关（重夯，原生式）＝每击 ×1.15、击数可到 5，代价是震波半径 ×0.8、裂痕更短。
 *     适用：对一个厚目标堆单点伤害。
 *
 * 伤害段 `quake` 与参数同名，走共享换算；**不写接触标记**，所以它不会触发接触类特性与道具（地面伤害沿地面传来）。
 */
namespace PokemonSkills {
    export const bonerushId = "bonerush";
    export const bonerushScene = "world_combat:move_bonerush";
    export const bonerushTallyText = "world_combat.move.bonerush.text.tally";

    actionParameters.define(bonerushId, {
        /** 每击威力：25 + 物攻偏移[−5,13]×0.14 + 等级偏移[0,7]×0.2；裂地 ×0.85 / 重夯 ×1.15；夹 15..58。 */
        quake: formula(
            F.base(25).plus(F.stat("attack").minus(55).times(0.14).clamp(-5, 13))
                .plus(F.level().minus(24).times(0.2).clamp(0, 7))
                .times(F.when(F.pref("fissure", text("worldcombat.skill.bonerush.preference.fissure")), F.const(0.85), F.const(1.15)))
                .clamp(15, 58).round(1),
            "每击威力", { base: 25,
                unit: "威力",
                description: "每一击骨头夯下去、沿地层传到目标脚底的威力；物攻定沉、等级定骨硬。重夯式更重、裂地式略轻。对手物防、相性与暴击在每击命中时另算。"
            }),
        /** 击数：2 + 物攻偏移[0,1.5] + 等级(≥24)偏移[0,1.3]；向下取整；裂地上限 3、重夯上限 5；夹 2..5。 */
        strikes: formula(
            F.base(2)
                .plus(F.stat("attack").minus(55).times(0.02).clamp(0, 1.5))
                .plus(F.level().minus(24).times(0.025).clamp(0, 1.3))
                .floor()
                .clamp(F.const(2), F.when(F.pref("fissure", text("worldcombat.skill.bonerush.preference.fissure")), F.const(3), F.const(5))),
            "击数", {
                unit: "击",
                description: "这一串最多夯几下（原生 2～5）；物攻定收骨快慢、等级定耐力。裂地式收在 3 击、重夯式可到 5 击。"
            }),
        /** 震波半径：1.6 + 体重偏移[−0.2,0.9]×0.003 + 等级偏移[0,0.6]×0.02；裂地 ×1.3 / 重夯 ×0.8；夹 1.0..3.0。 */
        shock: formula(
            F.base(1.6).plus(F.body("weight").minus(60).times(0.003).clamp(-0.2, 0.9))
                .plus(F.level().minus(24).times(0.02).clamp(0, 0.6))
                .times(F.when(F.pref("fissure", text("worldcombat.skill.bonerush.preference.fissure")), F.const(1.3), F.const(0.8)))
                .clamp(1.0, 3.0).round(2),
            "震波半径", { base: 1.6,
                unit: "格",
                description: "落点周围多大一片地面被震动、传到哪里；体重大的个体砸得更开、等级高的传得更远。画面里那个圈就是落点震波范围。"
            }),
        /** 掷距：7 + 等级偏移[0,2]×0.04 + 速度偏移[−1,2.5]×0.02；夹 5..13。 */
        throwRange: formula(
            F.base(7).plus(F.level().minus(24).times(0.04).clamp(0, 2))
                .plus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2.5))
                .clamp(5, 13).round(1),
            "掷距", {
                unit: "格",
                description: "骨头能扔到多远；等级与出手速度越高越远，也是本招的实际射程来源。"
            }),
        /** 骨速：1.4 + 速度偏移[−0.2,0.6]×0.008 + 等级偏移[0,0.3]×0.004；裂地 ×0.92；夹 1.0..2.4。 */
        flight: formula(
            F.base(1.4).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.6))
                .plus(F.level().minus(24).times(0.004).clamp(0, 0.3))
                .times(F.when(F.pref("fissure", text("worldcombat.skill.bonerush.preference.fissure")), F.const(0.92), F.const(1)))
                .clamp(1.0, 2.4).round(2),
            "骨速", {
                unit: "格/刻",
                description: "骨头飞行的速度；速度快的个体扔得更急，裂地式略慢（更沉地砸下去）。"
            }),
        /** 弧坠：0.04 + 体重偏移[−0.005,0.02]×0.0004 + 等级偏移[0,0.02]×0.0004；夹 0.02..0.07。 */
        boomArc: formula(
            F.base(0.04).plus(F.body("weight").minus(60).times(0.0004).clamp(-0.005, 0.02))
                .plus(F.level().minus(24).times(0.0004).clamp(0, 0.02))
                .clamp(0.02, 0.07).round(4),
            "弧坠", {
                unit: "格/刻²",
                description: "骨头下坠的重力，决定它砸下来的弧有多陡；体重越大、等级越高弧越陡。"
            }),
        /** 裂痕时长：100 + 等级偏移[0,100]×2；裂地 ×1.5；夹 60..320。 */
        crack: seconds(
            F.base(100).plus(F.level().minus(24).times(2).clamp(0, 100))
                .times(F.when(F.pref("fissure", text("worldcombat.skill.bonerush.preference.fissure")), F.const(1.5), F.const(1)))
                .clamp(60, 320).round(0),
            "裂痕时长", "落点那层地表被震裂后维持多久（到期原方块回来）；等级越高、裂地式留痕越久。"),
        /** 末击倍率：1.2 + 等级偏移[0,0.2]×0.004；夹 1.0..1.5。 */
        finish: formula(
            F.base(1.2).plus(F.level().minus(24).times(0.004).clamp(0, 0.2)).clamp(1.0, 1.5).round(2),
            "末击倍率", { base: 1.2,
                unit: "倍",
                description: "最后一击比前面重多少；等级越高收得越重。"
            }),
        /** 挑起：0.12 + 物攻偏移[0,0.3]×0.004；夹 0.05..0.4。 */
        lift: formula(
            F.base(0.12).plus(F.stat("attack").minus(55).times(0.004).clamp(0, 0.3)).clamp(0.05, 0.4).round(2),
            "挑起", {
                unit: "格",
                description: "落点震波把站上去的人向上顶起多高；物攻越大顶得越高。"
            }),
        /** 骨判定：0.2 + 身高偏移[−0.02,0.1]×0.08；夹 0.16..0.34。 */
        boneRadius: formula(
            F.base(0.2).plus(F.body("height").minus(1.4).times(0.08).clamp(-0.02, 0.1)).clamp(0.16, 0.34).round(2),
            "骨判定", {
                unit: "格",
                description: "一根骨头飞行与落地的判定大小；体型越高骨头越大。画面里的骨长与它一致。"
            }),
        /** 间隔：5 − 速度偏移[−1,1.8]×0.02；夹 3..8。 */
        gap: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.8)).clamp(3, 8).round(0),
            "间隔", "两击之间隔多久；速度越快夯得越密。"),
        /** 每击命中率：0.9 + 速度偏移[−0.03,0.05]；夹 0.75..0.98。 */
        accuracy: percent(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.001).clamp(-0.03, 0.05)).clamp(0.75, 0.98).round(3),
            "每击命中率", "每一击独立掷的命中率（原生 90% 起）；速度提高它。目标在骨头落地前走开，这一击就砸在空地上。"),
        /** 扬尘数量：14 + 物攻偏移[−3,14]；夹 10..34。 */
        dust: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.12).clamp(-3, 14)).clamp(10, 34).round(0),
            "扬尘数量", {
                unit: "点",
                description: "每一击在落点崩起的碎石与扬尘数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：8 − 速度偏移[−1.2,1.8]；夹 4..12。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.2, 1.8)).clamp(4, 12).round(0),
            "起手", "拔骨、拧身到第一击掷出的时间；速度越快越短。"),
        /** 收招：8 − 速度偏移[−1.2,1.6]；夹 4..12。 */
        settle: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.025).clamp(-1.2, 1.6)).clamp(4, 12).round(0),
            "收招", "这一串夯完收势的时间；速度越快收得越快。"),
        /** 冷却：28 − 速度偏移[−3,4]；夹 16..36。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 4)).clamp(16, 36).round(0),
            "冷却", "再起一串夯击前等待多久；速度越快回得越快。PP 10 的代价。")
    });

    defineDamage(bonerushId, "quake", {});

    stages(bonerushId, [
        { level: 24, values: { quake: 31 } },
        { level: 42, values: { quake: 38, shock: 2.2 } },
        { level: 60, values: { quake: 44, finish: 1.35 } }
    ]);

    describe(bonerushId, [
        { key: "description.0", values: ["quake", "strikes", "accuracy"] },
        { key: "description.1", values: ["throwRange", "flight", "boomArc", "shock"] },
        { key: "description.2", values: ["crack", "finish", "boneRadius", "lift", "gap", "dust"] },
        { key: "fissure.on", values: [], when: function (context) { return read(context.detail.values, ["fissure"]) === true; } },
        { key: "fissure.off", values: [], when: function (context) { return read(context.detail.values, ["fissure"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.quake"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.quake", "tier.1.shock"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.quake", "tier.2.finish"] }
    ]);
}
