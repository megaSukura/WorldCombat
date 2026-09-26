/**
 * 啄 / peck 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：飞行、物理、威力 35、命中 100、PP 35、优先度 0、接触、
 * target any（可命中空中目标，flags.distance）、无追加效果。描述「用尖锐的喙或角刺向对手进行攻击」。
 *
 * 翻译：把「用喙尖刺一下」翻成**全身前探、喙尖朝身前一个点一记快到几乎看不到起手的点啄**——
 * 它是本族最轻、最快、最省的一记，靠的是可以一记接一记地甩，而不是单发的分量。
 * 原生的可命中空中落成「啄落」：目标离地时喙尖勾住它往下带，伤害更高并被压回地面。
 *
 * 与同族分开：啄钻是原地旋转、连续几口把目标往后顶的钻孔，龙爪是宽弧重斩，角撞是顶住推走，
 * 木枝突刺是从最远处一记直刺；啄是唯一「贴脸、单发、专把空中的打下来」的快速点啄。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   peck       啄击威力：物攻定喙尖、等级给老练；俯冲式更重、点啄式更轻更快。
 *   reach      喙程：身高给颈长与探身，速度给前探，也是实际射程。
 *   beak       喙尖判定半径：体宽决定喙身多粗。
 *   lunge      前探步：速度给冲量；俯冲式把身位整个送出去。
 *   plummet    啄落距离：体重给下压的分量；俯冲式压得更狠，实际下降受原生碰撞与抗性限制。
 *   airBonus   对空加成：速度让快的个体啄得准；俯冲式再抬一点。
 *   feathers   羽屑量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度与等级定起手、收势与循环；俯冲式更费。
 *
 * 配置 `dive`（俯冲式，默认关）双向取舍：开启＝前探步 ×1.9、射程 ×1.18、威力 ×1.1、对空加成 +0.1，
 * 但起手 +3 刻、收招 +2 刻、冷却 +5 刻（整个人扑出去、回气慢）；关闭（点啄式）＝原地速啄，射程与威力略低，
 * 但起手与循环最短，可以连续甩。两向各有局面：贴脸压制 vs 一击突进。
 *
 * 伤害段 `peck` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("peck", {
        /** 啄击威力：34 + 物攻偏移[−4,14] ×0.22 + 等级偏移[−2,6] ×0.18；俯冲 ×1.1 / 点啄 ×0.97；夹 22..64。 */
        peck: formula(
            F.base(34).plus(F.stat("attack").minus(55).times(0.22).clamp(-4, 14))
                .plus(F.level().minus(20).times(0.18).clamp(-2, 6))
                .times(F.when(F.pref("dive", text("worldcombat.skill.peck.preference.dive")), F.const(1.1), F.const(0.97)))
                .clamp(22, 64).round(1),
            "啄击威力", {
                unit: "威力",
                description: "喙尖点中目标那一下的基础威力；物攻定喙尖、等级给老练。对手防御、相性与暴击在命中时另算。"
            }),
        /** 喙程：1.7 + 身高偏移[−0.25,0.7] ×0.5 + 速度偏移[−0.1,0.25] ×0.004；俯冲 ×1.18；夹 1.4..2.7。 */
        reach: formula(
            F.base(1.7).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.25, 0.7))
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.25))
                .times(F.when(F.pref("dive", text("worldcombat.skill.peck.preference.dive")), F.const(1.18), F.const(1)))
                .clamp(1.4, 2.7).round(2),
            "喙程", {
                unit: "格",
                description: "喙尖能够到多远；身高给颈长与探身、速度给前探。它也是本招的实际射程来源，是全族最短的一条线。"
            }),
        /** 喙尖判定半径：0.3 + 体宽偏移[−0.04,0.16] ×0.12；夹 0.24..0.5。 */
        beak: formula(
            F.base(0.3).plus(F.body("width").minus(0.9).times(0.12).clamp(-0.04, 0.16)).clamp(0.24, 0.5).round(2),
            "喙尖判定", {
                unit: "格",
                description: "喙尖这一啄的判定半径；身板越宽喙身越粗。画面里那道短线的粗细与它一致。"
            }),
        /** 前探步：0.4 + 速度偏移[−0.1,0.35] ×0.004；俯冲 ×1.9；夹 0.2..1.4。 */
        lunge: formula(
            F.base(0.4).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.35))
                .times(F.when(F.pref("dive", text("worldcombat.skill.peck.preference.dive")), F.const(1.9), F.const(1)))
                .clamp(0.2, 1.4).round(2),
            "前探步", {
                unit: "格",
                description: "出喙时身体前探的一步；速度给的冲量，俯冲式把整个身位扑出去。只探到判定边缘，不会穿过目标。"
            }),
        /** 啄落距离：0.45 + 体重偏移[0,0.2] ×0.001；俯冲 ×1.2；夹 0.3..0.95。 */
        plummet: formula(
            F.base(0.45).plus(F.body("weight").minus(50).times(0.001).clamp(0, 0.2))
                .times(F.when(F.pref("dive", text("worldcombat.skill.peck.preference.dive")), F.const(1.2), F.const(1)))
                .clamp(0.3, 0.95).round(2),
            "啄落距离", {
                unit: "格",
                description: "目标离地时被喙尖勾住、受原生碰撞与击退抗性约束按向地面的距离；越重的个体压得越狠。被免疫或抗性完全挡下时不产生位移，也不会播放啄落。"
            }),
        /** 对空加成：1.2 + 速度偏移[0,0.2] ×0.002 + 俯冲 +0.1；夹 1.1..1.55。 */
        airBonus: formula(
            F.base(1.2).plus(F.stat("speed").minus(60).times(0.002).clamp(0, 0.2))
                .plus(F.when(F.pref("dive", text("worldcombat.skill.peck.preference.dive")), F.const(0.1), F.const(0)))
                .clamp(1.1, 1.55).round(2),
            "对空加成", {
                unit: "倍",
                description: "目标脚踏实地时不吃；离地时这一啄的伤害乘上它——喙尖专啄空中的破绽，这也是原生「可命中空中」的落点。"
            }),
        /** 羽屑量：12 + 物攻偏移[−2,8] ×0.1；夹 8..30。 */
        feathers: formula(
            F.base(12).plus(F.stat("attack").minus(55).times(0.1).clamp(-2, 8)).clamp(8, 30).round(0),
            "羽屑量", {
                unit: "片",
                description: "命中时崩出的羽屑与细绒数量，由物攻换算；粒子按它发射，画面里的片数与机制一致。"
            }),
        /** 起手：4 − 速度偏移[−1.5,2] ×0.03 + 俯冲 +3；夹 3..12。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("dive", text("worldcombat.skill.peck.preference.dive")), F.const(3), F.const(0)))
                .clamp(3, 12).round(0),
            "起手", "缩颈、把喙尖对准目标的时间；这一招几乎没有起手破绽，俯冲式要多压一拍。"),
        /** 收招：4 − 速度偏移[−1,1.5] ×0.02 + 俯冲 +2；夹 3..10。 */
        aftercast: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("dive", text("worldcombat.skill.peck.preference.dive")), F.const(2), F.const(0)))
                .clamp(3, 10).round(0),
            "收招", "啄完把脖子收回来、重新站稳的收势；速度越快越短。"),
        /** 冷却：10 − 等级偏移[0,3] ×0.06 + 俯冲 +5；夹 7..22。 */
        recharge: seconds(
            F.base(10).minus(F.level().minus(20).times(0.06).clamp(0, 3))
                .plus(F.when(F.pref("dive", text("worldcombat.skill.peck.preference.dive")), F.const(5), F.const(0)))
                .clamp(7, 22).round(0),
            "冷却", "两啄之间等多久；PP 有 35，这一招本就该频繁用，俯冲式额外更费。")
    });

    stages("peck", [
        { level: 22, values: { peck: 40 } },
        { level: 38, values: { peck: 48, reach: 2.0 } }
    ]);

    defineDamage("peck", "peck", {}, { contact: true });

    describe("peck", [
        { key: "description.0", values: ["peck"] },
        { key: "description.1", values: ["reach","beak","lunge"] },
        { key: "description.2", values: ["airBonus","plummet"] },
        { key: "dive.on", values: ["reach", "peck"], when: function (context) { return read(context.detail.values, ["dive"]) === true; } },
        { key: "dive.off", values: ["reach", "peck"], when: function (context) { return read(context.detail.values, ["dive"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.peck"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.peck", "tier.1.reach"] }
    ]);
}
