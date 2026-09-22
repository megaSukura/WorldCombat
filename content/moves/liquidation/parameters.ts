/**
 * 水流裂破 / liquidation 的参数与伤害段。
 *
 * 原生事实：Water、物理、威力 85、命中 100、PP 10、接触、20% 令目标防御 −1（Cobblemon 1.8，146 位学习者）。
 * 翻译：把「用水之力量撞过去」做成**先裹水成刃、再撞开护甲**——水先在身上压成一层贴身的刃，撞实的一刻
 * 在接触面整个劈开：打伤、把目标顶开、留下一层湿身，并有概率顺着裂口把防御压下一级。
 * **水压（特攻）与撞击（物攻）分工**：撞击威力同时吃物攻与特攻（水的压力），破防概率只看特攻；冲撞速度随速度，
 * 顶开随体重，浸湿时长随等级；**雨天或已湿身**时水压更重（水做了垫）。防御被压下一级时另打共享身份
 * `world_combat:status/sundered`，别的作者可以消费“护甲已被撕开”。
 * 配置 shred（破甲式）把这一下从硬压改成撕甲：破防更高、能压两级，但正面威力降低；重压式相反。
 *
 * 伤害段名 crash：这一撞随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("liquidation", {
        /** 撞击威力：攻击每比 60 多 1 加 0.38（上限 +34），特攻每比 60 多 1 加 0.2（上限 +20），体重每比 60 多 1 加 0.08（上限 +14）；破甲 ×0.9 / 重压 ×1.07；雨天或湿身 ×1.12；夹在 55..165。 */
        crash: formula(
            F.base(82).plus(F.stat("attack").minus(60).times(0.38).clamp(-14, 34))
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-8, 20))
                .plus(F.body("weight").minus(60).times(0.08).clamp(-4, 14))
                .times(F.when(F.pref("shred", text("worldcombat.skill.liquidation.preference.shred")), F.const(0.9), F.const(1.07)))
                .times(F.when(F.world("rain", "雨天或身湿").gt(0.2), F.const(1.12), F.const(1)))
                .clamp(55, 165).round(1),
            "撞击威力", {
                unit: "威力",
                description: "裹水正面撞上去的基础威力；物攻给出撞击、特攻给出水压，雨天或已湿身时水更重。破甲式把力道摊薄一些。对手防御、相性与暴击在命中时另算。"
            }),
        /** 破防概率：基础 0.18，特攻每比 60 多 1 加 0.0012（上限 +0.14）；破甲式 +0.16；夹在 0.12..0.55。 */
        shredChance: percent(
            F.base(0.18).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.04, 0.14))
                .plus(F.when(F.pref("shred", text("worldcombat.skill.liquidation.preference.shred")), F.const(0.16), F.const(0)))
                .clamp(0.12, 0.55).round(3),
            "破防概率", "撞实后顺着裂口把目标防御压下一级的概率；特攻越强水刃越利，破甲式再抬高一截。"),
        /** 破防级数：破甲式压 2 级，重压式压 1 级。 */
        shredStages: formula(
            F.when(F.pref("shred", text("worldcombat.skill.liquidation.preference.shred")), F.const(2), F.const(1)).round(0),
            "破防级数", {
                unit: "级",
                description: "一次破防把目标防御压下几级；破甲式裂得更深，重压式只压一级。"
            }),
        /** 浸湿时长：基础 80 刻，等级每比 30 高 1 加 1.2 刻（上限 +60）；破甲式 +20；夹在 60..240。 */
        soakTicks: seconds(
            F.base(80).plus(F.level().minus(30).times(1.2).clamp(0, 60))
                .plus(F.when(F.pref("shred", text("worldcombat.skill.liquidation.preference.shred")), F.const(20), F.const(0)))
                .clamp(60, 240).round(0),
            "浸湿时长", "目标被水打湿、带着共享身份 world_combat:status/soaked 的时长；等级越高水挂得越久，破甲式留得更久。"),
        /** 冲撞距离：基础 3.8 格，速度每比 55 多 1 加 0.018（上限 +1.4），体重每比 60 多 1 加 0.004（上限 +0.8）；夹在 3.0..6.4。 */
        charge: formula(
            F.base(3.8).plus(F.stat("speed").minus(55).times(0.018).clamp(-0.5, 1.4))
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.2, 0.8))
                .clamp(3.0, 6.4).round(2),
            "冲撞距离", {
                unit: "格",
                description: "从起步到撞上的总位移；驱动目标接受范围。腿快、身重的个体冲得更远。"
            }),
        /** 冲撞速度：基础 0.6 格/刻，速度每比 55 多 1 加 0.005（上限 +0.35）；夹在 0.4..1.05。 */
        dashSpeed: formula(
            F.base(0.6).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.35)).clamp(0.4, 1.05).round(2),
            "冲撞速度", {
                unit: "格/刻",
                description: "裹着水冲出去时每刻前进的距离。"
            }),
        /** 水刃半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.14；夹在 0.36..0.9。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.14)).clamp(0.36, 0.9).round(2),
            "水刃半径", {
                unit: "格",
                description: "裹在身上的水刃半径，也是撞上活体的判定半径；画面里的水壳与它同大。"
            }),
        /** 顶开距离：基础 0.4 格，体重每比 60 多 1 加 0.003（上限 +0.7）；夹在 0.2..1.1。 */
        push: formula(
            F.base(0.4).plus(F.body("weight").minus(60).times(0.003).clamp(-0.1, 0.7)).clamp(0.2, 1.1).round(2),
            "顶开距离", {
                unit: "格",
                description: "撞实后把目标沿冲撞方向推开的距离；越重推得越远。"
            }),
        traceAhead: hidden(1.3),
        minimumMove: hidden(0.05)
    });

    stages("liquidation", [
        { level: 30, values: { crash: 92 } },
        { level: 48, values: { crash: 104, shredChance: 0.26 } }
    ]);

    defineDamage("liquidation", "crash", { defenceCoefficient: 0.005 }, { contact: true });

    describe("liquidation", [
        { key: "description.0", values: ["crash", "collisionRadius"] },
        { key: "description.1", values: ["shredChance", "shredStages", "soakTicks"] },
        { key: "description.2", values: ["charge", "dashSpeed", "push"] },
        { key: "shred.on", values: [], when: function (context) { return read(context.detail.values, ["shred"]) === true; } },
        { key: "shred.off", values: [], when: function (context) { return read(context.detail.values, ["shred"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.crash", "tier.1.shredChance"] }
    ]);
}
