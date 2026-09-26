/**
 * 舍身冲撞 / doubleedge 的参数与伤害段。
 *
 * 原生事实：一般、物理、威力 120、命中 100、PP 15、接触、反作用力 1/3（Cobblemon 1.8，584 位学习者）。
 * 翻译：把“拼命地猛撞向对手，自己也会受到不小的伤害”落成一次**最朴素的全身正面猛冲**——
 * 压低身体沿瞄准方向直线撞出去，撞实的一刻把惯性整个压进目标：目标被顶飞，自己不再被反震弹开，
 * 而是贴着它短促压身、再原地沉重收势，把破绽留在原地。反震是中等，不追求极端的自损。
 *
 * 与同族分开：勇鸟猛攻从空中俯冲打穿一条线；波动冲裹水撞击、把人浇透；木槌用坚硬躯体垂直砸下。
 * 舍身冲撞没有额外花样，它的辨识点是撞完之后**不弹回、贴住压身**的那一下——玩家凭“顶飞后原地露破绽”认出它。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   tackle          冲撞威力：物攻给狠度，体重把份量压进去；定桩式略收。
 *   rush            冲撞距离：速度决定起步冲得多远；同时是本招射程基准。
 *   speed           推进速度：速度决定每刻前进多少。
 *   collisionRadius 判定半径：碰撞箱高度决定撞面大小。
 *   recoil          反伤比例：防御越高越轻，体重越大反震越沉；定桩式把冲击全吃下。
 *   shove           撞飞距离：体重与物攻决定把目标顶多远；定桩式顶得更远。
 *   press           压身时长：撞实后整个人压在目标身上的时间；定桩式压得更久，收势更露破绽。
 *   dust            扬尘数量：速度与体重派生，表现按它发射。
 *   tempo/aftercast/recharge  速度决定起手/收招/冷却；定桩式更慢。
 * 配置 brace（定桩式）双向取舍：开启＝把重心全压上去、顶得更远、压身更久，但反伤更重、起手与收招更慢；
 * 关闭（猛进式）＝撞完更快收势、反伤更轻，顶飞略近。两个方向各有适用局面（把人推离 vs 快速回身）。
 *
 * 伤害段 tackle：这一撞随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("doubleedge", {
        /** 冲撞威力：基础 120，物攻每比 60 多 1 加 0.5（上限 +55），体重每比 60 多 1 加 0.18（上限 +40）；定桩 ×0.94；夹在 70..235。 */
        tackle: formula(
            F.base(120).plus(F.stat("attack").minus(60).times(0.5).clamp(-30, 55))
                .plus(F.body("weight").minus(60).times(0.18).clamp(-12, 40))
                .times(F.when(F.pref("brace", text("worldcombat.skill.doubleedge.preference.brace")), F.const(0.94), F.const(1)))
                .clamp(70, 235).round(1),
            "冲撞威力", {
                unit: "威力",
                description: "全身撞实这一下的基础威力；物攻越高、身体越沉撞得越狠，定桩式略收一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲撞距离：基础 4.0 格，速度每比 60 快 1 加 0.022，体重每比 60 多 1 加 0.002；定桩 ×0.88；夹在 2.8..6.6。 */
        rush: formula(
            F.base(4.0).plus(F.stat("speed").minus(60).times(0.022).clamp(-1.0, 2.4))
                .plus(F.body("weight").minus(60).times(0.002).clamp(-0.2, 0.8))
                .times(F.when(F.pref("brace", text("worldcombat.skill.doubleedge.preference.brace")), F.const(0.88), F.const(1)))
                .clamp(2.8, 6.6).round(2),
            "冲撞距离", {
                unit: "格",
                description: "从起步到刹停的总位移，也是本招的射程基准；腿快、份量足的个体够得到更远的对手，定桩式收得更短。"
            }),
        /** 推进速度：基础 0.82 格/刻，速度每比 60 快 1 加 0.006；夹在 0.55..1.45。 */
        speed: formula(
            F.base(0.82).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.25, 0.6)).clamp(0.55, 1.45).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "低头猛冲时每刻前进的距离；越快越难被侧移让开。"
            }),
        /** 判定半径：基础 0.55 格加碰撞箱高度 ×0.15；夹在 0.4..0.95。 */
        collisionRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.15)).clamp(0.4, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "撞出去的整个身体扫过的横向判定半径；身板越高大撞面越宽。"
            }),
        /** 反伤比例：基础 0.33，防御每比 60 多 1 少 0.0006（上限 −0.14），体重每比 60 多 1 加 0.0008（上限 +0.12）；定桩 ×1.16 / 猛进 ×0.9；夹在 0.16..0.5。 */
        recoil: formula(
            F.base(0.33).minus(F.stat("defence").minus(60).times(0.0006).clamp(0, 0.14))
                .plus(F.body("weight").minus(60).times(0.0008).clamp(-0.05, 0.12))
                .times(F.when(F.pref("brace", text("worldcombat.skill.doubleedge.preference.brace")), F.const(1.16), F.const(0.9)))
                .clamp(0.16, 0.5).round(3),
            "反伤比例", {
                unit: "比例",
                description: "撞中后按实际伤害反震自己的比例；防御越高越轻、身体越沉冲击越大，定桩式把冲击全吃下，猛进式只吃一小部分。"
            }),
        /** 撞飞距离：基础 0.9 格，体重每比 60 多 1 加 0.004（上限 +0.9），物攻每比 60 多 1 加 0.003（上限 +0.5）；定桩 ×1.3；夹在 0.4..2.6。 */
        shove: formula(
            F.base(0.9).plus(F.body("weight").minus(60).times(0.004).clamp(-0.3, 0.9))
                .plus(F.stat("attack").minus(60).times(0.003).clamp(-0.2, 0.5))
                .times(F.when(F.pref("brace", text("worldcombat.skill.doubleedge.preference.brace")), F.const(1.3), F.const(1)))
                .clamp(0.4, 2.6).round(2),
            "撞飞距离", {
                unit: "格",
                description: "命中后把目标沿冲撞方向顶飞多远；越重、物攻越高顶得越远，定桩式顶得更狠。"
            }),
        /** 压身时长：基础 4 刻，速度每比 60 快 1 减 0.012 刻，定桩 ×1.9；夹在 2..10。 */
        press: seconds(
            F.base(4).minus(F.stat("speed").minus(60).times(0.012).clamp(-0.6, 1.2))
                .times(F.when(F.pref("brace", text("worldcombat.skill.doubleedge.preference.brace")), F.const(1.9), F.const(1)))
                .clamp(2, 10).round(0),
            "压身时长", "撞实后整个人压上去、把目标按在原地的那一瞬；压得更久越显沉重，定桩式压到最久，也把破绽留得更明显。"),
        /** 扬尘数量：基础 24，速度每比 60 快 1 加 0.35（夹 -8..20），体重每比 60 多 1 加 0.15（夹 -5..14）；夹在 16..72。 */
        dust: formula(
            F.base(24).plus(F.stat("speed").minus(60).times(0.35).clamp(-8, 20))
                .plus(F.body("weight").minus(60).times(0.15).clamp(-5, 14))
                .clamp(16, 72).round(0),
            "扬尘数量", {
                unit: "个",
                description: "冲锋与碰撞扬起的尘屑数量，随速度与体重增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 8 刻，速度每比 60 快 1 减 0.02 刻，定桩 +2 刻；夹在 5..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("brace", text("worldcombat.skill.doubleedge.preference.brace")), F.const(2), F.const(0)))
                .clamp(5, 13).round(0),
            "起手", "压低身体、踏地蓄势的时长；速度越快越干脆，定桩式要先站稳。"),
        /** 收招：基础 9 刻，速度每比 60 快 1 减 0.025 刻，定桩 +3 刻；夹在 5..16。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.025).clamp(-3, 4))
                .plus(F.when(F.pref("brace", text("worldcombat.skill.doubleedge.preference.brace")), F.const(3), F.const(0)))
                .clamp(5, 16).round(0),
            "收招", "撞完站稳的收势；猛进式压得短、收得快，定桩式压完还要重新起步。"),
        /** 冷却：基础 46 刻，速度每比 60 快 1 减 0.05 刻，定桩 +8 刻；夹在 30..72。 */
        recharge: seconds(
            F.base(46).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 10))
                .plus(F.when(F.pref("brace", text("worldcombat.skill.doubleedge.preference.brace")), F.const(8), F.const(0)))
                .clamp(30, 72).round(0),
            "冷却", "两次舍身冲撞之间的间隔；速度越快回得越快，定桩式蓄势更久。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    stages("doubleedge", [
        { level: 36, values: { tackle: 130 } },
        { level: 56, values: { tackle: 145, recoil: 0.35 } }
    ]);

    defineDamage("doubleedge", "tackle", { defenceCoefficient: 0.005,
        rationale: "最朴素的正面猛撞，按标准防御系数结算，靠体型与等级拉开差距。" }, { contact: true });

    describe("doubleedge", [
        { key: "description.0", values: ["tackle","rush","speed","collisionRadius"] },
        { key: "description.1", values: ["recoil","shove","press"] },
        { key: "brace.on", values: [], when: function (context) { return read(context.detail.values, ["brace"]) === true; } },
        { key: "brace.off", values: [], when: function (context) { return read(context.detail.values, ["brace"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.tackle"] },
        { key: "growth.1", values: ["tier.1.level","tier.1.tackle","tier.1.recoil"] }
    ]);
}
