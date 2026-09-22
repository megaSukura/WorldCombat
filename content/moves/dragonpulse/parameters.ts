/**
 * 龙之波动 / dragonpulse —— 参数与伤害段。
 *
 * 原生事实：Dragon／特殊／威力 85／命中 100／PP 10／目标单体（any，可打远）／无次要效果／pulse 标记（Cobblemon 1.8，103 位学习者）。
 *
 * 翻译：把「从大大的口中掀起冲击波」落成一条**沿瞄准线持续前推的同心波动**——龙息在张大的口前被压成一圈圈
 * 波面，一圈接一圈沿直线推出去；波前扫过排在一条线上的敌人后不停下、继续前进（贯通式）。这是本组唯一
 * 「持续、按特攻缩放、能穿过成排目标」的那一击，与龙息（贴地扇形吐息）、音爆（瞬时裂痕）、龙之怒（固定重击）分开。
 * 配置 `chain`（连锁式）换成另一种波的形态：波在碰到第一个敌人时收束、在它周围炸开一圈（不再前进），
 * 用射程与贯穿换一片覆盖——两份形态各有自己的局面。
 *
 * 数据分散（每项依赖不同的精灵数据，落到不同参数）：
 *   pulse        波面威力：特攻定龙息压得多紧，等级台阶再抬一档；连锁式把这一发摊薄。
 *   reach        波动射程：等级与特攻决定这一列波能推多远；它也是本招实际射程来源。
 *   flight       推进速度：速度决定波面走多快（越快越难被走开）。
 *   thickness    波面厚度／判定半径：碰撞箱高度决定波面多厚，也决定贴着线两侧多宽会被扫到。
 *   pierce       贯穿目标：特攻与等级决定一条线上最多额外穿过几个（仅贯通式）。
 *   rings        波面道数：特攻与等级换算出同时推进的圈数，同时驱动表现里的波环数量。
 *   burst        连锁威力：连锁式在命中点周围炸开那一圈对每个目标的威力（仅连锁式）。
 *   burstRadius  连锁半径：身高与特攻决定收束时罩开多大（仅连锁式）。
 *   tempo／aftercast／recharge：速度定起手，身高定收势，等级与配置定冷却。
 *
 * 伤害段 `pulse`（主波面）与 `burst`（连锁炸开）与参数同名，走共享换算（原生类别 Special，Dragon 属性，非接触，带 pulse 标记）。
 */
namespace PokemonSkills {
    actionParameters.define("dragonpulse", {
        /** 波面威力：基础 76，特攻每比 60 多 1 加 0.34（夹 −14..40）；连锁 ×0.90；夹 50..148。 */
        pulse: formula(
            F.base(76).plus(F.stat("specialAttack").minus(60).times(0.34).clamp(-14, 40))
                .times(F.when(F.pref("chain", text("worldcombat.skill.dragonpulse.preference.chain")), F.const(0.90), F.const(1)))
                .clamp(50, 148).round(1),
            "波面威力", {
                unit: "威力",
                description: "波面扫中每个目标时的基础威力；特攻越高龙息压得越紧。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：基础 8.0，等级每高 1 级加 0.09（夹 0..3），特攻每比 60 多 1 加 0.03（夹 −1..2）；夹 6.5..15。 */
        reach: formula(
            F.base(8.0).plus(F.level().minus(28).times(0.09).clamp(0, 3))
                .plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1, 2))
                .clamp(6.5, 15).round(2),
            "波动射程", {
                unit: "格",
                description: "这一列波能推到多远；等级与特攻越高推得越远。它也是本招的实际射程来源。"
            }),
        /** 推进速度：基础 0.85，速度每比 55 快 1 加 0.006（夹 −0.2..0.5）；夹 0.6..1.5。 */
        flight: formula(
            F.base(0.85).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.5)).clamp(0.6, 1.5).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "波面沿直线推进的速度；速度快的个体推得更急，目标更难在半路走开。"
            }),
        /** 波面厚度：基础 0.42，碰撞箱每比 1.4 高 1 格加 0.12（夹 −0.08..0.28）；夹 0.32..0.85。 */
        thickness: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.08, 0.28)).clamp(0.32, 0.85).round(2),
            "波面厚度", {
                unit: "格",
                description: "波面的判定半径，也是线两侧会被扫到的宽度；大个子的波面更厚。"
            }),
        /** 贯穿目标：基础 1，特攻每比 60 多 1 加 0.02（夹 0..2），等级每高 1 级加 0.04（夹 0..1.5）；夹 0..4。 */
        pierce: formula(
            F.base(1).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 2))
                .plus(F.level().minus(28).times(0.04).clamp(0, 1.5)).clamp(0, 4).round(0),
            "贯穿目标", {
                unit: "个",
                description: "贯通式下这一列波在一条线上最多额外穿过几个敌人；特攻与等级越高穿得越多。"
            }),
        /** 波面道数：基础 3，特攻每比 60 多 1 加 0.03（夹 −1..3），等级每高 1 级加 0.06（夹 0..2）；夹 2..7。 */
        rings: formula(
            F.base(3).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1, 3))
                .plus(F.level().minus(28).times(0.06).clamp(0, 2)).clamp(2, 7).round(0),
            "波面道数", {
                unit: "道",
                description: "同时推进的同心波面数量，也决定画面里的波环有几道；特攻与等级越高波越厚。"
            }),
        /** 连锁威力：基础 54，特攻每比 60 多 1 加 0.26（夹 −10..30）；夹 34..110。 */
        burst: formula(
            F.base(54).plus(F.stat("specialAttack").minus(60).times(0.26).clamp(-10, 30)).clamp(34, 110).round(1),
            "连锁威力", {
                unit: "威力",
                description: "连锁式收束时，命中点周围每个敌人各挨的一记；特攻越高炸得越重。"
            }),
        /** 连锁半径：基础 1.6，身高每比 1.4 高 1 格加 0.35（夹 −0.2..0.9），特攻每比 60 多 1 加 0.006（夹 −0.2..0.6）；夹 1.3..3.0。 */
        burstRadius: formula(
            F.base(1.6).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.2, 0.9))
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.2, 0.6))
                .clamp(1.3, 3.0).round(2),
            "连锁半径", {
                unit: "格",
                description: "连锁式在命中点周围罩开的范围；身板越大、特攻越高罩得越开。"
            }),
        /** 起手：基础 12 刻，速度每比 55 快 1 少 0.06 刻（夹 −3..5）；夹 7..16。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 5)).clamp(7, 16).round(0),
            "起手时长", "张嘴把龙息压成波面之前要多久；快的个体收得更快。"),
        /** 收势：基础 9 刻，身高每比 1.4 高 1 格加 2 刻（夹 −2..4）；夹 6..14。 */
        aftercast: seconds(
            F.base(9).plus(F.body("height").minus(1.4).times(2).clamp(-2, 4)).clamp(6, 14).round(0),
            "收势时长", "波推出去之后收口的时间；个头大的个体收得慢一些。"),
        /** 冷却：基础 34 刻，等级每高 1 级减 0.2（夹 −4..6），连锁 +6；夹 24..46。 */
        recharge: seconds(
            F.base(34).minus(F.level().minus(28).times(0.2).clamp(-4, 6))
                .plus(F.when(F.pref("chain", text("worldcombat.skill.dragonpulse.preference.chain")), F.const(6), F.const(0)))
                .clamp(24, 46).round(0),
            "冷却", "两次龙之波动之间要等多久；等级越高恢复越快，连锁式因为要重新聚力而更久。"),
        maximumTargets: hidden(4)
    });

    stages("dragonpulse", [
        { level: 40, values: { pulse: 92, reach: 9.5 } },
        { level: 56, values: { pulse: 110, reach: 11, pierce: 3 } }
    ]);

    defineDamage("dragonpulse", "pulse", { defenceCoefficient: 0.005 }, { pulse: true });
    defineDamage("dragonpulse", "burst", { defenceCoefficient: 0.005 }, { pulse: true });

    describe("dragonpulse", [
        { key: "description.0", values: ["pulse", "thickness"] },
        { key: "description.1", values: ["reach", "flight", "rings"] },
        { key: "chain.on", values: ["burst", "burstRadius"], when: function (context) { return read(context.detail.values, ["chain"]) === true; } },
        { key: "chain.off", values: ["pierce"], when: function (context) { return read(context.detail.values, ["chain"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pulse", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pulse", "tier.1.reach", "tier.1.pierce"] }
    ]);
}
