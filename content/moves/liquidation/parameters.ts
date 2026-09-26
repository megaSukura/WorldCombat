/**
 * 水流裂破 / liquidation 的参数与伤害段。
 *
 * 原生事实：Water、物理、威力 85、命中 100、PP 10、接触、20% 令目标防御 −1（Cobblemon 1.8，146 位学习者）。
 * 翻译：把「用水之力量撞过去」做成**短前踏后一次横向水刃扫切**——先把水压成贴身的窄刃，向前踏出半步，
 * 再贴着身体由一侧扫向另一侧，横切眼前一排身体：打伤、顶开、留下湿身，并有概率顺着裂口把防御压下一级。
 * **水压（特攻）与扫切（物攻）分工**：单发威力同时吃物攻与特攻（水的压力），破防概率只看特攻；前踏随速度与体重，
 * 扇形半径随身高与速度，张角随速度，浸湿时长随等级；**雨天或已湿身**时水压更重（水做了垫）。防御被压下一级时
 * 另打共享身份 `world_combat:status/sundered`，别的作者可以消费“护甲已被撕开”。
 * 配置 shred（破甲式）把这一下从硬压改成撕甲：破防更高、能压两级，但单发威力降低；重压式相反。
 *
 * 伤害段名 crash：这一次横切随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("liquidation", {
        /** 单发威力：攻击每比 60 多 1 加 0.38（上限 +34），特攻每比 60 多 1 加 0.2（上限 +20），体重每比 60 多 1 加 0.08（上限 +14）；破甲 ×0.9 / 重压 ×1.07；雨天或湿身 ×1.12；夹在 55..165。 */
        crash: formula(
            F.base(82).plus(F.stat("attack").minus(60).times(0.38).clamp(-14, 34))
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-8, 20))
                .plus(F.body("weight").minus(60).times(0.08).clamp(-4, 14))
                .times(F.when(F.pref("shred", text("worldcombat.skill.liquidation.preference.shred")), F.const(0.9), F.const(1.07)))
                .times(F.when(F.world("rain", "雨天或身湿").gt(0.2), F.const(1.12), F.const(1)))
                .clamp(55, 165).round(1),
            "横切威力", {
                unit: "威力",
                description: "水刃横切命中的基础威力；物攻给出切劲、特攻给出水压，雨天或已湿身时水更重。破甲式把力道摊薄一些。对手防御、相性与暴击在命中时另算。"
            }),
        /** 破防概率：基础 0.18，特攻每比 60 多 1 加 0.0012（上限 +0.14）；破甲式 +0.16；夹在 0.12..0.55。 */
        shredChance: percent(
            F.base(0.18).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.04, 0.14))
                .plus(F.when(F.pref("shred", text("worldcombat.skill.liquidation.preference.shred")), F.const(0.16), F.const(0)))
                .clamp(0.12, 0.55).round(3),
            "破防概率", "被刃段擦实后顺着裂口把目标防御压下一级的概率；特攻越强水刃越利，破甲式再抬高一截。"),
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
        /** 前踏距离：基础 0.9 格，速度每比 55 多 1 加 0.01（上限 +0.5），体重每比 60 多 1 加 0.001（上限 +0.2）；破甲 ×1.05 / 重压 ×0.95；夹在 0.5..1.6。 */
        step: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.01).clamp(-0.15, 0.5))
                .plus(F.body("weight").minus(60).times(0.001).clamp(-0.05, 0.2))
                .times(F.when(F.pref("shred", text("worldcombat.skill.liquidation.preference.shred")), F.const(1.05), F.const(0.95)))
                .clamp(0.5, 1.6).round(2),
            "前踏距离", {
                unit: "格",
                description: "起手向前踏进的短距离；水刃从这个落点扫出。腿快身重者踏得更前，破甲式稍长、重压式更贴身。"
            }),
        /** 扇刃半径：基础 2.7 格，碰撞箱每比 1.4 高 1 格加 0.2（上限 +0.8），速度每比 55 多 1 加 0.008（上限 +0.6）；夹在 2.0..4.2。 */
        reach: formula(
            F.base(2.7).plus(F.body("height").minus(1.4).times(0.2).clamp(-0.3, 0.8))
                .plus(F.stat("speed").minus(55).times(0.008).clamp(-0.2, 0.6))
                .clamp(2.0, 4.2).round(2),
            "扇刃半径", {
                unit: "格",
                description: "水刃从身前扫过的扇形半径；身板越大、腿越快，扇面铺得越开。它也是目标接受范围的主体。"
            }),
        /** 横扫张角：基础 150 度，速度每比 55 多 1 加 0.4（上限 +44）；夹在 110..200。 */
        sweepAngle: formula(
            F.base(150).plus(F.stat("speed").minus(55).times(0.4).clamp(-24, 44)).clamp(110, 200).round(0),
            "横扫张角", {
                unit: "度",
                description: "水刃从左到右扫过的总张角；越宽越容易一次擦到站在侧面的一排人。"
            }),
        /** 横扫时长：基础 8 刻，速度每比 55 快 1 少 0.04 刻（上限 −1）；夹在 4..12。 */
        sweepTicks: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.04).clamp(-1, 3)).clamp(4, 12).round(0),
            "横扫时长", "完整横扫一遍花多久；动作快者扫得更干脆，每一刻只结算当前刃段擦到的人。"),
        /** 水刃厚度：基础 0.42 格，碰撞箱每比 1.4 高 1 格加 0.1（上限 +0.25），防御每比 60 多 1 加 0.001（上限 +0.15）；夹在 0.28..0.7。 */
        bladeThickness: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.25))
                .plus(F.stat("defence").minus(60).times(0.001).clamp(-0.05, 0.15))
                .clamp(0.28, 0.7).round(2),
            "水刃厚度", {
                unit: "格",
                description: "横切水刃的判定厚度，也是画面里水刃的宽窄；身板越大、护甲越厚，刃越厚，墙体遮挡仍逐段判定。"
            }),
        /** 刃推距离：基础 0.3 格，体重每比 60 多 1 加 0.002（上限 +0.5）；夹在 0.1..0.9。 */
        push: formula(
            F.base(0.3).plus(F.body("weight").minus(60).times(0.002).clamp(-0.08, 0.5)).clamp(0.1, 0.9).round(2),
            "刃推距离", {
                unit: "格",
                description: "被刃段擦中后沿水刃的径向推开多远；越重推得越远。推不动的大型目标照样吃满横切与破防。"
            })
    });

    stages("liquidation", [
        { level: 30, values: { crash: 92 } },
        { level: 48, values: { crash: 104, shredChance: 0.26 } }
    ]);

    defineDamage("liquidation", "crash", { defenceCoefficient: 0.005 }, { contact: true });

    describe("liquidation", [
        { key: "description.0", values: ["crash", "bladeThickness"] },
        { key: "description.1", values: ["step", "reach", "sweepAngle"] },
        { key: "description.2", values: ["sweepTicks", "push"] },
        { key: "description.3", values: ["shredChance", "shredStages", "soakTicks"] },
        { key: "shred.on", values: [], when: function (context) { return read(context.detail.values, ["shred"]) === true; } },
        { key: "shred.off", values: [], when: function (context) { return read(context.detail.values, ["shred"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.crash", "tier.1.shredChance"] }
    ]);
}
