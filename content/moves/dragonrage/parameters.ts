/**
 * 龙之怒 / dragonrage —— 参数与固定伤害。
 *
 * 原生事实：Dragon／特殊／威力 0、**固定伤害 40**／命中 100／PP 10／目标单体（normal）／无次要效果／
 *   已不再作为标准招式（isNonstandard: Past）（Cobblemon 1.8，31 位学习者）。
 *
 * 翻译：把「将愤怒的冲击波撞向对手、必定给予 40 的伤害」落成一记**不与攻防比较的重击**——怒火在施法者
 * 身上窜起、压成一颗赤红的龙息弹，正面砸在对手身上；无论对方多硬都固定削掉 40 点生命，只有属性免疫能挡住它。
 * 固定伤害是这招的承诺本身，因此 `damage` 不读任何精灵数据；**变化的是它的出手方式与后果**——射程、飞行速度、
 * 判定、把人撞退多远、撞完钉住多久、爆炸式罩多大，各按不同的精灵数据取值。配置 `erupt`（怒爆式）换成
 * 抵达即炸开、罩住一片的形态：范围换射程与冷却，也没有钉住。
 *
 * 数据分散（每项依赖不同的精灵数据，落到不同参数）：
 *   reach        射程：等级与特攻决定怒气能送多远；它也是本招实际射程来源。
 *   velocity     飞行速度：速度决定龙息弹飞得多急。
 *   radius       判定半径：碰撞箱高度决定弹体大小。
 *   push         撞退距离：体重与物攻决定把目标顶开多远。
 *   blastRadius  爆发半径：身高与体重决定怒爆式罩开多大（仅怒爆式）。
 *   pinTicks     钉住时长：等级决定撞完按住对手多久（仅猛撞式）。
 *   motes        怒焰量：体重与等级换算，驱动表现密度。
 *   tempo／settle／recharge：速度定起手，身高定收势，等级与配置定冷却。
 *
 * 固定伤害：`damage` 由行动直接结算（绕过攻防），见 skill.ts 的 `dragonrageRawHit`。
 */
namespace PokemonSkills {
    actionParameters.define("dragonrage", {
        /** 固定伤害：恒为 40，不读任何精灵数据；只有属性免疫能挡住它。 */
        damage: formula(
            F.const(40),
            "固定伤害", {
                unit: "点",
                description: "这一击固定削掉的生命点数，原生即为 40；对手的攻击、防御、属性相性都不参与结算，只有属性免疫会挡住它。"
            }),
        /** 射程：基础 7.0，等级每高 1 级加 0.09（夹 0..3），特攻每比 60 多 1 加 0.025（夹 −1..1.8）；夹 5.5..13。 */
        reach: formula(
            F.base(7.0).plus(F.level().minus(28).times(0.09).clamp(0, 3))
                .plus(F.stat("specialAttack").minus(60).times(0.025).clamp(-1, 1.8))
                .clamp(5.5, 13).round(2),
            "射程", {
                unit: "格",
                description: "怒气能送到多远；等级与特攻越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 飞行速度：基础 0.9，速度每比 55 快 1 加 0.007（夹 −0.2..0.55）；夹 0.6..1.6。 */
        velocity: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.007).clamp(-0.2, 0.55)).clamp(0.6, 1.6).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "龙息弹飞出去的速度；速度快的个体撞得更急，目标更难在半路走开。"
            }),
        /** 判定半径：基础 0.4，碰撞箱每比 1.4 高 1 格加 0.11（夹 −0.08..0.24）；夹 0.3..0.8。 */
        radius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.11).clamp(-0.08, 0.24)).clamp(0.3, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "龙息弹的判定半径；大个子的弹体更粗。"
            }),
        /** 撞退距离：基础 0.5，体重每比 60 重 1kg 加 0.004（夹 −0.15..0.6），物攻每比 60 多 1 加 0.004（夹 −0.1..0.35）；夹 0.25..1.4。 */
        push: formula(
            F.base(0.5).plus(F.body("weight").minus(60).times(0.004).clamp(-0.15, 0.6))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.1, 0.35))
                .clamp(0.25, 1.4).round(2),
            "撞退距离", {
                unit: "格",
                description: "被这一下正面撞中的人被顶开多远；越重、物攻越高的个体推得越狠。"
            }),
        /** 爆发半径：基础 1.8，身高每比 1.4 高 1 格加 0.4（夹 −0.2..0.9），体重每比 60 重 1kg 加 0.003（夹 −0.2..0.7）；夹 1.4..3.2。 */
        blastRadius: formula(
            F.base(1.8).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.9))
                .plus(F.body("weight").minus(60).times(0.003).clamp(-0.2, 0.7))
                .clamp(1.4, 3.2).round(2),
            "爆发半径", {
                unit: "格",
                description: "怒爆式抵达时炸开的范围；身板越大越重罩得越开。"
            }),
        /** 钉住时长：基础 22 刻，等级每高 1 级加 0.5 刻（夹 0..20）；夹 16..46。 */
        pinTicks: seconds(
            F.base(22).plus(F.level().minus(28).times(0.5).clamp(0, 20)).clamp(16, 46).round(0),
            "钉住时长", "猛撞式把目标撞退后按住它、让它短时间内走不动；等级越高按得越久。"),
        /** 怒焰量：基础 18，体重每比 60 重 1kg 加 0.12（夹 −4..18），等级每高 1 级加 0.3（夹 0..8）；夹 14..60。 */
        motes: formula(
            F.base(18).plus(F.body("weight").minus(60).times(0.12).clamp(-4, 18))
                .plus(F.level().minus(28).times(0.3).clamp(0, 8)).clamp(14, 60).round(0),
            "怒焰量", {
                unit: "点",
                description: "这招在表现里喷出的怒焰与余烬数量；越重、等级越高的个体烧得越烈。"
            }),
        /** 起手：基础 11 刻，速度每比 55 快 1 少 0.05 刻（夹 −2..4）；夹 7..15。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 4)).clamp(7, 15).round(0),
            "起手时长", "把怒火压成弹、砸出去之前要多久；快的个体收得更快。"),
        /** 收势：基础 10 刻，身高每比 1.4 高 1 格加 1.5 刻（夹 −2..3.5）；夹 6..14。 */
        settle: seconds(
            F.base(10).plus(F.body("height").minus(1.4).times(1.5).clamp(-2, 3.5)).clamp(6, 14).round(0),
            "收势时长", "砸出去之后收势的时间；个头大的个体收得慢一些。"),
        /** 冷却：基础 34 刻，等级每高 1 级减 0.25（夹 −5..7），怒爆 +8；夹 24..52。 */
        recharge: seconds(
            F.base(34).minus(F.level().minus(28).times(0.25).clamp(-5, 7))
                .plus(F.when(F.pref("erupt", text("worldcombat.skill.dragonrage.preference.erupt")), F.const(8), F.const(0)))
                .clamp(24, 52).round(0),
            "冷却", "两次龙之怒之间要等多久；等级越高恢复越快，怒爆式因为要重新聚力而更久。"),
        maximumTargets: hidden(5)
    });

    stages("dragonrage", [
        { level: 36, values: { reach: 8.2 } },
        { level: 52, values: { reach: 9.5, pinTicks: 32 } }
    ]);

    describe("dragonrage", [
        { key: "description.0", values: ["damage"] },
        { key: "description.1", values: ["reach","velocity","radius"] },
        { key: "erupt.on", values: ["damage","blastRadius","push","maximumTargets"], when: function (context) { return read(context.detail.values, ["erupt"]) === true; } },
        { key: "erupt.off", values: ["push","pinTicks"], when: function (context) { return read(context.detail.values, ["erupt"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.pinTicks"] }
    ]);
}
