/**
 * 泥巴射击 / mudshot 的参数与伤害段。
 *
 * 原生事实：Ground、特殊、威力 55、命中 95、PP 15、target normal，命中后必定降低 1 级速度（Cobblemon 1.8 / Showdown，237 位学习者）。
 *
 * 翻译：把「向对手投掷泥块」落成一道**贴地平飞、又快又阔的泥浆**——泥块沿低弧甩出，命中时在目标脚下炸开，
 * 溅开的泥浆糊上附近所有敌人的腿脚，谁被糊住谁掉速度；落点地上留下一片湿泥（`terrain` 租借，到期原方块回来）。
 * 与同族分开：掷泥（mudslap）是低弧软泥团糊脸、必定削**命中**；泥巴炸弹（mudbomb）是直线硬弹炸开、有概率削命中；
 * 泥巴射击是**贴地阔泼**，掉的是**速度**，糊的范围是腿脚而不是脸。
 *
 * 数据分散（每项读不同的精灵数据，落到不同参数上）：
 *   spray      泥浆威力：特攻定泥的稠度，等级定份量；阔泼形态把能量摊开所以单发更轻。
 *   velocity   弹速：速度决定甩得多急。
 *   legRadius  泥块判定：体型高度决定投出的泥块大小。
 *   reach      投掷距离：特攻决定能泼多远；阔泼略近。
 *   splash     泼溅半径：体型高度与特攻；阔泼摊得更开，是「几个人一起被糊」的来源。
 *   slowStages 掉速等级：特攻每满 120 多压一级；阔泼再多一级（夹 1..3）。
 *   slowTicks  糊腿时长：等级与**体重**——越重的个体泥挂得越久，也是 mired 身份与腿脚画面的时长。
 *   coat       泥点数量：特攻与等级驱动，表现按它发射。
 *   slickTicks 泥洼时长：等级决定地上那片湿泥留多久。
 *   tempo      起手：速度决定抓泥、甩泥的快慢。
 * 配置 wide（阔泼）双向取舍：开＝泼溅更宽、掉速更深、地上泥洼更久，但单发更轻、更近、冷却更久；
 * 关＝一道更重更远更快的泥浆，代价是只糊得住脚下这一小圈。两向各有局面（点掉一个 / 罩住一片）。
 *
 * 伤害段 `spray` 与参数同名；属性与分类沿用原生 Ground／特殊，对手防御、相性与暴击在命中时统一结算。
 */
namespace PokemonSkills {
    actionParameters.define("mudshot", {
        /** 泥浆威力：46 + 特攻偏移[−8,32] + 等级(≥25)偏移[0,14]；阔泼 ×0.86；夹 30..108。 */
        spray: formula(
            F.base(46).plus(F.stat("specialAttack").minus(50).times(0.3).clamp(-8, 32))
                .plus(F.level().minus(25).times(0.5).clamp(0, 14))
                .times(F.when(F.pref("wide", text("worldcombat.skill.mudshot.preference.wide")), F.const(0.86), F.const(1)))
                .clamp(30, 108).round(1),
            "泥浆威力", {
                unit: "威力",
                description: "泥浆糊上目标那一下的基础威力；特攻越高越稠、等级越高份量越足，阔泼把力道摊到更宽的范围上。对手防御、相性与暴击在命中时另算。"
            }),
        /** 弹速：1.05 + 速度偏移[−0.15,0.4]；阔泼 ×0.9；夹 0.8..1.6。 */
        velocity: formula(
            F.base(1.05).plus(F.stat("speed").minus(50).times(0.006).clamp(-0.15, 0.4))
                .times(F.when(F.pref("wide", text("worldcombat.skill.mudshot.preference.wide")), F.const(0.9), F.const(1)))
                .clamp(0.8, 1.6).round(2),
            "弹速", {
                unit: "格/刻",
                description: "泥块平飞的速度；速度快的个体甩得更急，目标更难在半路走开。阔泼更散更慢。"
            }),
        /** 下坠：固定 0.014，是这一招「贴地平飞」的形状。 */
        gravity: formula(
            F.const(0.014), "下坠", {
                unit: "格/刻²",
                description: "泥块的下坠强度；比掷泥的抛物线更平，攻击面贴着地面走。"
            }),
        /** 泥块判定：0.2 + 体型高度 × 0.05；夹 0.2..0.36。 */
        legRadius: formula(
            F.base(0.2).plus(F.body("height").times(0.05)).clamp(0.2, 0.36).round(2),
            "泥块大小", {
                unit: "格",
                description: "飞行途中泥块的判定半径；体型越高投出的泥块越大。"
            }),
        /** 投掷距离：10 + 特攻偏移[−1,7] − 阔泼 2；夹 8..18。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(50).times(0.07).clamp(-1, 7))
                .minus(F.when(F.pref("wide", text("worldcombat.skill.mudshot.preference.wide")), F.const(2), F.const(0)))
                .clamp(8, 18).round(1),
            "投掷距离", {
                unit: "格",
                description: "能把泥浆泼到多远的目标；特攻高的个体泼得更远，阔泼更近。它也是本招的实际射程来源。"
            }),
        /** 泼溅半径：0.9 + 体型高度偏移[−0.1,0.6] + 特攻偏移[−0.1,0.5]；阔泼 ×1.6；夹 0.8..2.4。 */
        splash: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.3).clamp(-0.1, 0.6))
                .plus(F.stat("specialAttack").minus(50).times(0.003).clamp(-0.1, 0.5))
                .times(F.when(F.pref("wide", text("worldcombat.skill.mudshot.preference.wide")), F.const(1.6), F.const(1)))
                .clamp(0.8, 2.4).round(2),
            "泼溅半径", {
                unit: "格",
                description: "泥浆炸开、糊到附近敌人腿脚的半径；大个子、特攻高、阔泼形态罩得更开。它也是指示圈与判定环的半径。"
            }),
        /** 掉速等级：1 + 特攻 ≥ 120 + 阔泼 1；夹 1..3。 */
        slowStages: formula(
            F.base(1).plus(F.stat("specialAttack").gte(120))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.mudshot.preference.wide")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "掉速等级", {
                unit: "级",
                description: "被泥糊住腿脚后下降的速度能力等级；特攻每满 120 多压一级，阔泼再多一级（对其他战斗者落到移动速度属性）。"
            }),
        /** 糊腿时长：50 + 等级(≥25)偏移[0,26] + 体重 × 0.05；夹 40..150。 */
        slowTicks: seconds(
            F.base(50).plus(F.level().minus(25).times(0.8).clamp(0, 26)).plus(F.body("weight").times(0.05))
                .clamp(40, 150).round(0),
            "糊腿时长", "mired 身份挂多久，也是腿脚泥迹画面的持续时间；越重的个体泥挂得越久。"),
        /** 泥点数量：14 + 特攻偏移[−2,12] + 等级(≥25)偏移[0,10]；夹 12..44。 */
        coat: formula(
            F.base(14).plus(F.stat("specialAttack").minus(50).times(0.1).clamp(-2, 12))
                .plus(F.level().minus(25).times(0.3).clamp(0, 10)).clamp(12, 44).round(0),
            "泥点数量", {
                unit: "点",
                description: "命中处溅出的泥点数量，也驱动表现的密度；特攻与等级越高越密。"
            }),
        /** 泥洼时长：80 + 等级 × 1.0；夹 60..170。 */
        slickTicks: seconds(
            F.base(80).plus(F.level().times(1.0)).clamp(60, 170).round(0),
            "泥洼时长", "落点地上那片湿泥停留多久；到期原方块回来。"),
        /** 起手：10 − 速度偏移[−1,4]；夹 6..14。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(50).times(0.04).clamp(-1, 4)).clamp(6, 14).round(0),
            "起手", "抓泥、团起再甩出去的时间；速度越快越短。")
    });

    defineDamage("mudshot", "spray", {});

    stages("mudshot", [
        { level: 30, values: { spray: 58 } },
        { level: 50, values: { spray: 72, slowTicks: 92 } }
    ]);

    describe("mudshot", [
        { key: "description.0", values: ["spray", "splash", "slowStages"] },
        { key: "description.1", values: ["velocity", "reach", "legRadius"] },
        { key: "description.2", values: ["slowTicks", "slickTicks"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spray"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spray", "tier.1.slowTicks"] }
    ]);
}
