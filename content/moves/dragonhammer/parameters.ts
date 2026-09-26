/**
 * 龙锤 / dragonhammer 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：龙、物理、威力 90、命中 100、PP 15、单目标、接触、无次要效果。
 *
 * 翻译：把「将身体当作锤子」翻成**抡起整个身体、自上而下一记重砸在一个目标上**——施法者先弓身扬起、
 *   再沿面前一道垂直弧从身体前上方砸向前下；真实首个实体或地形的接触点决定落点。砸实的一下把目标砸得
 *   一个趔趄、走慢一阵（不是趴地模型，也不封攻击；状态被拒的控免目标照吃主伤，只是不减速）。
 *   没有反震、不裂地、不补第二下，代价是起手慢、只砸一个点。
 * 与同为「身体当武器」的招分开：
 *   泰山压顶 —— 跃起到落点、范围压中一圈、概率麻痹；
 *   木槌     —— 抬身砸下、裂开地表、反震自己、压速度；
 *   龙锤     —— 垂直弧砸单个目标、不裂地不反震，把目标**砸得趔趄**一小段（速度大幅下降）。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   hammer  锤击威力 76 + 物攻偏移 + 体重偏移 + 等级偏移（身体越沉、物攻越高砸得越狠）。
 *   reach   抡击距离 2.7 格 + 身高偏移 + 速度偏移。
 *   lunge   最多补上的小靠步 0.9 + 速度偏移（快的人贴得近；实际位移受身体扫掠与这一上限共同限制）。
 *   shove   击飞距离 0.7 + 体重偏移 + 物攻偏移；重锤式收得更短（压在原地）。
 *   downTicks 砸得趔趄的时长 26 刻 + 自身体重偏移 − 目标质量偏移（自己越沉砸得越久，目标越重越难被砸动）。
 *   sweep   垂直弧抡完的刻数 5 ± 重锤/疾锤 ± 速度（重锤更慢、疾锤更快；夹 4..6）。
 *   dust    龙气碎屑数量 20 + 体重偏移 + 物攻偏移（同时驱动画面密度）。
 *   tempo/aftercast/recharge  速度决定起手／收招／冷却；重锤式更慢。
 *
 * 配置 heavy（重锤式）双向取舍：开＝威力 ×1.15、趔趄 ×1.3、击飞 ×0.8、起手 +3、冷却 +8、垂直弧多 1 刻（砸得更重更久、
 *   把人钉在原地）；关（疾锤式）＝击飞 ×1.25、射程 ×1.1、起手更快、弧少 1 刻，代价是威力 ×0.9、趔趄 ×0.85。
 *
 * 伤害段 hammer 与参数同名，走共享换算（原始类别 Physical）。
 */
namespace PokemonSkills {
    /** 目标质量（hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算；越重越难被砸趴。 */
    const dragonhammerMassNode: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("dragonhammer", {
        /** 锤击威力：76 + 物攻偏移[−14,44] + 体重偏移[−3,14] + 等级(≥30)偏移[−4,10]；重锤 ×1.15 / 疾锤 ×0.9；夹 56..150。 */
        hammer: formula(
            F.base(76)
                .plus(F.stat("attack").minus(60).times(0.4).clamp(-14, 44))
                .plus(F.body("weight").minus(60).times(0.05).clamp(-3, 14))
                .plus(F.level().minus(30).times(0.3).clamp(-4, 10))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.dragonhammer.preference.heavy")), F.const(1.15), F.const(0.9)))
                .clamp(56, 150).round(1),
            "锤击威力", {
                unit: "威力",
                description: "把身体当锤子砸这一下的基础威力；物攻给出狠度，**身体越沉砸得越实**，等级再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 抡击距离：2.7 + 身高偏移[−0.3,1.2] + 速度偏移[−0.15,0.35]；重锤 ×0.95 / 疾锤 ×1.1；夹 2.2..4.4。 */
        reach: formula(
            F.base(2.7)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.2))
                .plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.35))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.dragonhammer.preference.heavy")), F.const(0.95), F.const(1.1)))
                .clamp(2.2, 4.4).round(2),
            "抡击距离", {
                unit: "格",
                description: "弓身抡起身体能够到的距离，也是本招的实际射程；身架越长够得越远，疾锤式略长。"
            }),
        /** 扑身距离：0.9 + 速度偏移[−0.2,0.5]；夹 0.5..1.8。 */
        lunge: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.2, 0.5)).clamp(0.5, 1.8).round(2),
            "扑身距离", {
                unit: "格",
                description: "砸下去之前最多朝目标补上的小靠步；速度快的个体补得更远。实际位移受原生身体扫掠与这一上限共同限制，够不到也不会因此必中。"
            }),
        /** 击飞距离：0.7 + 体重偏移[−0.2,0.9] + 物攻偏移[−0.15,0.4]；重锤 ×0.8 / 疾锤 ×1.25；夹 0.3..2.4。 */
        shove: formula(
            F.base(0.7)
                .plus(F.body("weight").minus(60).times(0.006).clamp(-0.2, 0.9))
                .plus(F.stat("attack").minus(60).times(0.002).clamp(-0.15, 0.4))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.dragonhammer.preference.heavy")), F.const(0.8), F.const(1.25)))
                .clamp(0.3, 2.4).round(2),
            "击飞距离", {
                unit: "格",
                description: "砸中后把目标沿砸击方向撞飞多远；身体越沉、物攻越高撞得越远，重锤式把人压在原地、撞得更短。"
            }),
        /** 砸得趔趄时长：26 + 自身体重偏移[−4,30] − 目标质量偏移[−3,9]；重锤 ×1.3 / 疾锤 ×0.85；夹 12..70。 */
        downTicks: seconds(
            F.base(26)
                .plus(F.body("weight").minus(60).times(0.2).clamp(-4, 30))
                .minus(dragonhammerMassNode.minus(300).times(0.012).clamp(-3, 9))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.dragonhammer.preference.heavy")), F.const(1.3), F.const(0.85)))
                .clamp(12, 70).round(0),
            "砸得趔趄时长", "被砸中后带着 world_combat:status/knocked_down 走慢一阵的时间：仍能出手，只是挪不动几步；**自己越沉砸得越久，目标越重越难被砸动**，重锤式更久。"),
        /** 抡击时长：5 − 速度偏移[−0.5,0.5]；重锤 +1 / 疾锤 −1；夹 4..6 刻。 */
        sweep: seconds(
            F.base(5)
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.dragonhammer.preference.heavy")), F.const(1), F.const(-1)))
                .minus(F.stat("speed").minus(60).times(0.006).clamp(-0.5, 0.5))
                .clamp(4, 6).round(0),
            "抡击时长", "整个身体沿垂直弧从身体前上端砸到前下所需的时间；疾锤式挥得更快、重锤式更慢更重。"),
        /** 龙气碎屑数量：20 + 体重偏移[−4,16] + 物攻偏移[−4,12]；夹 12..56。同时驱动画面密度。 */
        dust: formula(
            F.base(20)
                .plus(F.body("weight").minus(60).times(0.2).clamp(-4, 16))
                .plus(F.stat("attack").minus(60).times(0.15).clamp(-4, 12))
                .clamp(12, 56).round(0),
            "龙气碎屑数量", {
                unit: "个",
                description: "砸中时迸出的龙气与碎屑数量；随体重与物攻增长，粒子按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：12 − 速度偏移[−3,4]；重锤 +3；夹 8..18。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.dragonhammer.preference.heavy")), F.const(3), F.const(0)))
                .clamp(8, 18).round(0),
            "起手", "弓身扬起、把整个身体抡到最高点的时间；这一招起手偏慢，重锤式还要多蓄一点。"),
        /** 收招：9 − 速度偏移[−3,4]；夹 6..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4)).clamp(6, 14).round(0),
            "收招", "落地后把身体收回来、站稳的时间。"),
        /** 冷却：40 − 速度偏移[−4,8]；重锤 +8；夹 26..60。 */
        recharge: seconds(
            F.base(40).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 8))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.dragonhammer.preference.heavy")), F.const(8), F.const(0)))
                .clamp(26, 60).round(0),
            "冷却", "两次抡砸之间的等待；速度越快回得越快，重锤式缓得更久。"),
        maxTargets: hidden(1)
    });

    defineDamage("dragonhammer", "hammer", {}, { contact: true });

    stages("dragonhammer", [
        { level: 45, values: { hammer: 92 } }
    ]);

    describe("dragonhammer", [
        { key: "description.0", values: ["hammer","reach"] },
        { key: "description.1", values: ["shove","downTicks"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.hammer"] }
    ]);
}
