/**
 * 木枝突刺 / branchpoke 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：草、物理、威力 40、命中 100、PP 40、优先度 0、接触、无追加效果（5 位学习者）。
 * 描述「使用尖锐的树枝刺向对手进行攻击」。它是敲音猴一类的起手招。
 *
 * 翻译：把「用尖枝刺一下」翻成**从最远处把一根细枝绷直、用末梢的弹劲戳一下**——
 * 它是本组射程最长、线条最细的一记；而且**打在最远端最疼**：枝条伸到尽头时末梢弯到极限、回弹最猛，
 * 贴脸时反而只有枝根的一小段。刺枝式再把尖头削硬、抹上一记短暂的减速，但枝身收窄、弹劲变小。
 *
 * 与同族分开：藤鞭是一道远而宽的横扫鞭痕并连续抽；啄是中距单发；角撞是顶住推走；龙爪是宽弧重斩；
 * 木枝突刺凭「最长、最细、越远越疼的一记直戳」认出来。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   poke       枝击威力：物攻定枝身、等级给手法；刺枝式更硬、弹枝式更轻快。
 *   reach      枝长：身高给枝的长度，速度给一点前探，也是实际射程。
 *   twig       枝身半宽：体宽决定枝子多粗；刺枝式收窄以求戳准。
 *   bend       末梢弹劲：速度让快的个体弯得更狠；它把「越远越疼」的倍率写进公式。
 *   snareTicks 挂枝减速时长：等级决定扎住多久（仅刺枝式）。
 *   snareLevel 挂枝减速：原生振幅固定 1（缓慢 II）（仅刺枝式）。
 *   leaves     芽叶量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度与等级定节奏，刺枝式更费。
 *
 * 配置 `thorn`（刺枝式，默认关）双向取舍：开启＝威力 ×1.12、命中挂一记减速，代价是枝身收窄（判定 ×0.8）、
 * 末梢弹劲 ×0.6、起手 +3 刻、冷却 +5 刻；关闭（弹枝式）＝枝身更宽、越远越疼的倍率更高、出手更快。
 * 两向各有局面：控住目标 vs 吃满射程的伤害。
 *
 * 伤害段 `poke` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("branchpoke", {
        /** 枝击威力：38 + 物攻偏移[−5,16] ×0.24 + 等级偏移[−2,7] ×0.2；刺枝 ×1.12 / 弹枝 ×0.96；夹 28..74（贴脸值，实际按末梢弹劲加成）。 */
        poke: formula(
            F.base(38).plus(F.stat("attack").minus(55).times(0.24).clamp(-5, 16))
                .plus(F.level().minus(18).times(0.2).clamp(-2, 7))
                .times(F.when(F.pref("thorn", text("worldcombat.skill.branchpoke.preference.thorn")), F.const(1.12), F.const(0.96)))
                .clamp(28, 74).round(1),
            "枝击威力", {
                unit: "威力",
                description: "枝条戳中最靠里那一段的基础威力；物攻定枝身、等级给手法。实际伤害还要乘上末梢弹劲的「越远越疼」倍率。对手防御、相性与暴击在命中时另算。"
            }),
        /** 枝长：2.9 + 身高偏移[−0.3,1.0] ×0.5 + 速度偏移[0,0.35] ×0.006；夹 2.4..3.8。 */
        reach: formula(
            F.base(2.9).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 1.0))
                .plus(F.stat("speed").minus(60).times(0.006).clamp(0, 0.35))
                .clamp(2.4, 3.8).round(2),
            "枝长", {
                unit: "格",
                description: "细枝绷直后能戳到多远；身高给枝的长度、速度给前探。它也是本招的实际射程来源，是全组最长的一条线。"
            }),
        /** 枝身半宽：0.22 + 体宽偏移[−0.03,0.12] ×0.1；刺枝 ×0.8；夹 0.16..0.38。 */
        twig: formula(
            F.base(0.22).plus(F.body("width").minus(0.9).times(0.1).clamp(-0.03, 0.12))
                .times(F.when(F.pref("thorn", text("worldcombat.skill.branchpoke.preference.thorn")), F.const(0.8), F.const(1)))
                .clamp(0.16, 0.38).round(2),
            "枝身半宽", {
                unit: "格",
                description: "这一戳判定的横向半宽；身板越宽枝子越粗，刺枝式收窄以求戳准。画面里那道细线就是判定范围。"
            }),
        /** 末梢弹劲：0.35 + 速度偏移[0,0.2] ×0.002；刺枝 ×0.6；夹 0.18..0.6。 */
        bend: formula(
            F.base(0.35).plus(F.stat("speed").minus(60).times(0.002).clamp(0, 0.2))
                .times(F.when(F.pref("thorn", text("worldcombat.skill.branchpoke.preference.thorn")), F.const(0.6), F.const(1)))
                .clamp(0.18, 0.6).round(2),
            "末梢弹劲", {
                unit: "倍",
                description: "枝条伸到尽头时末梢弯到极限、回弹最猛的程度：伤害 ×(1 + 弹劲 × 目标距离/枝长)，因此打在最远端最疼、贴脸只有枝根的一段。"
            }),
        /** 挂枝减速时长：26 + 等级偏移[0,14] ×0.4；夹 18..52（仅刺枝式）。 */
        snareTicks: seconds(
            F.base(26).plus(F.level().minus(18).times(0.4).clamp(0, 14)).clamp(18, 52).round(0),
            "挂枝时长", "刺枝式把削硬的枝尖别在目标身上、使其减速的时间；等级越高扎得越久。"),
        /** 挂枝减速：原生振幅固定 1（缓慢 II）；夹 1..2（仅刺枝式）。 */
        snareLevel: formula(
            F.const(1).clamp(1, 2).round(0),
            "挂枝减速", {
                unit: "级", presentation: "amplifier",
                description: "刺枝式施加缓慢的原生强度；显示等级从 I 起算，原始值 1 对应缓慢 II（移动速度降低30%）。"
            }),
        /** 芽叶量：14 + 物攻偏移[−2,10] ×0.1；夹 10..32。 */
        leaves: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.1).clamp(-2, 10)).clamp(10, 32).round(0),
            "芽叶量", {
                unit: "片",
                description: "戳中与枝梢回弹时甩出的芽叶数量，由物攻换算；粒子按它发射，画面里的片数与机制一致。"
            }),
        /** 起手：6 − 速度偏移[−1.5,2.5] ×0.03 + 刺枝 +3；夹 4..13。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("thorn", text("worldcombat.skill.branchpoke.preference.thorn")), F.const(3), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "把细枝绷直、让末梢对准目标的时间；速度越快越短，刺枝式要多削两下。"),
        /** 收招：6 − 速度偏移[−1,2] ×0.02 + 刺枝 +2；夹 3..11。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("thorn", text("worldcombat.skill.branchpoke.preference.thorn")), F.const(2), F.const(0)))
                .clamp(3, 11).round(0),
            "收招", "戳完把枝子收回来、重新站稳的收势；速度越快越短。"),
        /** 冷却：14 − 等级偏移[0,3.5] ×0.08 + 刺枝 +5；夹 9..26。 */
        recharge: seconds(
            F.base(14).minus(F.level().minus(18).times(0.08).clamp(0, 3.5))
                .plus(F.when(F.pref("thorn", text("worldcombat.skill.branchpoke.preference.thorn")), F.const(5), F.const(0)))
                .clamp(9, 26).round(0),
            "冷却", "两次戳刺之间等多久；PP 有 40，这一招本就该频繁用，刺枝式额外更费。")
    });

    stages("branchpoke", [
        { level: 20, values: { poke: 44 } },
        { level: 36, values: { poke: 50, reach: 3.2 } }
    ]);

    defineDamage("branchpoke", "poke", {}, { contact: true });

    describe("branchpoke", [
        { key: "description.0", values: ["poke", "reach", "twig"] },
        { key: "description.1", values: ["bend"] },
        { key: "thorn.on", values: ["snareTicks","snareLevel","poke"], when: function (context) { return read(context.detail.values, ["thorn"]) === true; } },
        { key: "thorn.off", values: ["poke"], when: function (context) { return read(context.detail.values, ["thorn"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.poke"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.poke", "tier.1.reach"] }
    ]);
}
