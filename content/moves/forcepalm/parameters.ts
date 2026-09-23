/**
 * 发劲 / forcepalm —— 参数与伤害段。
 *
 * 原生事实：Fighting／物理／威力 60／命中 100／PP 10／接触／30% 令对手麻痹（Cobblemon 1.8，14 位学习者）。
 *
 * 翻译：把「向对手的身体发出冲击波」落成一次**贴身的掌击**——上步、掌心按在对手身上，把一记冲击波灌进身体里：
 * 物理伤害按力量结算，震动有概率让对手麻痹。这是本组唯一**接触**、唯一按物攻缩放的一击，与三道远程波分开。
 * 配置 `through`（透劲式）让波从身体另一侧透出，打到背后一条直线上的第二个敌人：主目标那一下略轻、麻痹概率略低，
 * 换一条穿透线；默认（崩劲式）收在一个人身上，更重、更容易打麻。
 *
 * 数据分散（每项依赖不同的精灵数据，落到不同参数）：
 *   palm            掌击威力：物攻决定这一掌的狠度，等级台阶再抬一档；透劲式把这一下摊薄。
 *   reach           贴身距离：碰撞箱高度决定多近算贴上；它也是本招实际射程来源。
 *   collisionRadius 判定半径：身高决定掌击判定多宽。
 *   numbChance      麻痹概率：原生 30% 起，物攻与等级提高咬住的机会；透劲式略低。
 *   push            推开距离：体重与等级决定把目标顶开多远。
 *   through         透劲威力：物攻决定透出身体那一下的力道（仅透劲式）。
 *   throughReach    透劲长度：等级决定波从背后再走多远（仅透劲式）。
 *   step            上步距离：速度决定贴近那一步能跨多远。
 *   motes           劲气量：物攻与等级换算，驱动表现密度。
 *   tempo／settle／recharge：速度定起手，身高定收势，等级与配置定冷却。
 *
 * 伤害段 `palm`（接触那一下）与 `through`（透出身体那一下）与参数同名，走共享换算（原生类别 Physical，Fighting 属性）。
 */
namespace PokemonSkills {
    actionParameters.define("forcepalm", {
        /** 掌击威力：基础 58，物攻每比 60 多 1 加 0.42（夹 −14..44），等级每高 1 级加 0.2（夹 0..6）；透劲 ×0.88；夹 40..130。 */
        palm: formula(
            F.base(58).plus(F.stat("attack").minus(60).times(0.42).clamp(-14, 44))
                .plus(F.level().minus(28).times(0.2).clamp(0, 6))
                .times(F.when(F.pref("through", text("worldcombat.skill.forcepalm.preference.through")), F.const(0.88), F.const(1)))
                .clamp(40, 130).round(1),
            "掌击威力", {
                unit: "威力",
                description: "掌心贴上对手那一下的基础威力；物攻越高越重，透劲式把力道分给背后的第二个人。对手防御、相性与暴击在命中时另算。"
            }),
        /** 贴身距离：基础 2.2，碰撞箱每比 1.4 高 1 格加 0.18（夹 −0.2..0.6）；夹 1.8..3.4。 */
        reach: formula(
            F.base(2.2).plus(F.body("height").minus(1.4).times(0.18).clamp(-0.2, 0.6)).clamp(1.8, 3.4).round(2),
            "贴身距离", {
                unit: "格",
                description: "多近算贴上对手的身体；大个子的手臂更长。它也是本招的实际射程来源。"
            }),
        /** 判定半径：基础 0.45，碰撞箱每比 1.4 高 1 格加 0.12（夹 −0.08..0.3）；夹 0.34..0.9。 */
        collisionRadius: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.08, 0.3)).clamp(0.34, 0.9).round(2),
            "判定半径", {
                unit: "格",
                description: "掌击的横向判定半径；身板越大按得越宽。"
            }),
        /** 麻痹概率：基础 0.30，物攻每比 60 多 1 加 0.0015（夹 −0.06..0.16），等级每高 1 级加 0.001（夹 0..0.05）；透劲 ×0.8；夹 0.16..0.50。 */
        numbChance: percent(
            F.base(0.30).plus(F.stat("attack").minus(60).times(0.0015).clamp(-0.06, 0.16))
                .plus(F.level().minus(28).times(0.001).clamp(0, 0.05))
                .times(F.when(F.pref("through", text("worldcombat.skill.forcepalm.preference.through")), F.const(0.8), F.const(1)))
                .clamp(0.16, 0.50).round(3),
            "麻痹概率", "掌心那一下的震动让对手肌肉失序、陷入麻痹的概率（原生 30%）；物攻与等级越高越容易咬住，透劲式力道分散、略低。"),
        /** 推开距离：基础 0.35，体重每比 60 重 1kg 加 0.004（夹 −0.12..0.5），等级每高 1 级加 0.012（夹 0..0.25）；夹 0.15..1.0。 */
        push: formula(
            F.base(0.35).plus(F.body("weight").minus(60).times(0.004).clamp(-0.12, 0.5))
                .plus(F.level().minus(28).times(0.012).clamp(0, 0.25)).clamp(0.15, 1.0).round(2),
            "推开距离", {
                unit: "格",
                description: "掌击把目标顶开多远；越重、等级越高的个体推得越远。"
            }),
        /** 透劲威力：基础 38，物攻每比 60 多 1 加 0.34（夹 −8..34），等级每高 1 级加 0.12（夹 0..4）；夹 24..90。 */
        through: formula(
            F.base(38).plus(F.stat("attack").minus(60).times(0.34).clamp(-8, 34))
                .plus(F.level().minus(28).times(0.12).clamp(0, 4)).clamp(24, 90).round(1),
            "透劲威力", {
                unit: "威力",
                description: "波从身体另一侧透出、打到背后直线目标那一下的威力（仅透劲式）；物攻越高透出的力道越足。"
            }),
        /** 透劲长度：基础 3.2，等级每高 1 级加 0.09（夹 0..2.3）；夹 2.4..5.5。 */
        throughReach: formula(
            F.base(3.2).plus(F.level().minus(28).times(0.09).clamp(0, 2.3)).clamp(2.4, 5.5).round(2),
            "透劲长度", {
                unit: "格",
                description: "波从目标背后还能再走多远；等级越高透得越远（仅透劲式）。"
            }),
        /** 上步距离：基础 1.2，速度每比 55 快 1 加 0.012（夹 −0.2..0.8）；夹 0.8..2.2。 */
        step: formula(
            F.base(1.2).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.2, 0.8)).clamp(0.8, 2.2).round(2),
            "上步距离", {
                unit: "格",
                description: "贴上去那一步最多能跨多远；速度快的个体更容易按到对手身上。"
            }),
        /** 劲气量：基础 16，物攻每比 60 多 1 加 0.14（夹 −4..16），等级每高 1 级加 0.25（夹 0..6）；夹 12..48。 */
        motes: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.14).clamp(-4, 16))
                .plus(F.level().minus(28).times(0.25).clamp(0, 6)).clamp(12, 48).round(0),
            "劲气量", {
                unit: "点",
                description: "这一掌在表现里炸开的劲气与碎点数量；物攻与等级越高越密。"
            }),
        /** 起手：基础 8 刻，速度每比 55 快 1 少 0.05 刻（夹 −2..3）；夹 5..12。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 3)).clamp(5, 12).round(0),
            "起手时长", "沉肩、把劲压在掌心之前要多久；快的个体收得更快。"),
        /** 收势：基础 8 刻，身高每比 1.4 高 1 格加 1.2 刻（夹 −1.5..3）；夹 5..12。 */
        settle: seconds(
            F.base(8).plus(F.body("height").minus(1.4).times(1.2).clamp(-1.5, 3)).clamp(5, 12).round(0),
            "收势时长", "推完收手的时间；个头大的个体收得慢一些。"),
        /** 冷却：基础 24 刻，等级每高 1 级减 0.22（夹 −4..5），透劲 +6；夹 16..38。 */
        recharge: seconds(
            F.base(24).minus(F.level().minus(28).times(0.22).clamp(-4, 5))
                .plus(F.when(F.pref("through", text("worldcombat.skill.forcepalm.preference.through")), F.const(6), F.const(0)))
                .clamp(16, 38).round(0),
            "冷却", "两次发劲之间要等多久；等级越高恢复越快，透劲式因为要重新聚力而更久。"),
        throughTargets: hidden(2)
    });

    stages("forcepalm", [
        { level: 34, values: { palm: 74 } },
        { level: 50, values: { palm: 90, numbChance: 0.38 } }
    ]);

    defineDamage("forcepalm", "palm", { defenceCoefficient: 0.0055 }, { contact: true });
    defineDamage("forcepalm", "through", { defenceCoefficient: 0.006 });

    describe("forcepalm", [
        { key: "description.0", values: ["palm", "collisionRadius"] },
        { key: "description.1", values: ["reach","numbChance","push","step"] },
        { key: "description.paralysis", values: [] },
        { key: "through.on", values: ["through","throughReach","throughTargets"], when: function (context) { return read(context.detail.values, ["through"]) === true; } },
        { key: "through.off", values: [], when: function (context) { return read(context.detail.values, ["through"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.palm"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.palm", "tier.1.numbChance"] }
    ]);
}
