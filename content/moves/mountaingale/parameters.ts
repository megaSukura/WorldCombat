/**
 * 冰山风 / mountaingale 的参数与伤害段。
 *
 * 原生事实：Ice／物理／威力 100／命中 85／PP 10／非接触／30% 畏缩／单体（Cobblemon 1.8，1 位学习者——签名招）。
 * 翻译：把“将冰山般巨大的冰块砸向对手”落成一次**从地里拔起一块巨冰、沿低弧线抡出去**的重投——巨冰在身前
 * 由碎冰汇聚而成，飞出去看得见、能侧身躲，砸实的一刻碎冰炸开一整圈，中心还竖起一小簇冰锥。
 * 它是全家最重的远程招：射程长、单发最高、能波及落点一圈，代价是起手最长、飞行最慢、命中率最低。
 *
 * 与同族分开：头锤笔直便宜、意念头锤会追人、铁头短程掀人。与同为冰系投掷的冰柱坠击分开：冰柱是**从天上
 * 竖直砸向事先标好的点**，本招是**从施法者这边沿弧线甩过去**、会被地形挡下，砸出的是一簇冰锥而不是一片冰面。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   mass         巨冰主伤 100 + 物攻偏移 + 体重偏移 + 等级偏移；冰川式 ×1.10。
 *   splash       溅射副伤 45 + 物攻偏移 + 体重偏移（落点一圈的次要伤害）。
 *   shatterRadius 碎裂半径 2.2 + 体重偏移 + 身高偏移；冰川式 ×1.15。
 *   throwRange   投掷距离 12 + 物攻偏移 + 等级偏移；驱动实际射程。
 *   flightSpeed  飞行速度 0.85 + 速度偏移 − 体重偏移（越重越慢、越好躲）；冰川式 ×0.85。
 *   arcFall      下落系数 0.05 + 体重偏移（越重落得越快）；冰川式 ×1.15（弧线更高）。
 *   collisionRadius 巨冰判定 0.6 + 身高偏移。
 *   flinchChance 畏缩几率 0.30 + 体重偏移（原生 30%）。
 *   flinchTicks  畏缩持续 18 刻（全家最久）。
 *   iceTicks     冰面与冰锥停留 100 刻 + 等级 ×0.8。
 *   spikeHeight  冰锥高度 2 + 体重偏移（中心竖起的冰簇）。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却，整体最慢。
 *
 * 配置 `glacier`（冰山式）双向取舍：开启＝更大更重、弧线更高、冰锥更高，但飞行更慢、准备与冷却更久；
 * 关闭＝碎冰式，抛得更平更快、半径更小、出手更快。两个方向各有适用局面（阵地重击 vs 追击）。
 *
 * 伤害段 `mass`（主伤）与 `splash`（溅射）与参数同名，走共享换算；本招非接触，不加 contact 标记。
 */
namespace PokemonSkills {
    actionParameters.define("mountaingale", {
        /** 巨冰主伤：攻击每比 50 多 1 加 0.30（上限 +34），体重每比 50 多 1 加 0.05（上限 +18），
         *  等级每 1 级加 0.06（上限 +3）；冰川 ×1.10 / 碎冰 ×0.95；夹在 60..165。 */
        mass: formula(
            F.base(100).plus(F.stat("attack").minus(50).times(0.30).clamp(-16, 34))
                .plus(F.body("weight").minus(50).times(0.05).clamp(-4, 18))
                .plus(F.level().minus(25).times(0.06).clamp(0, 3))
                .times(F.when(F.pref("glacier", text("worldcombat.skill.mountaingale.preference.glacier")), F.const(1.10), F.const(0.95)))
                .clamp(60, 165).round(1),
            "巨冰主伤", {
                unit: "威力",
                description: "被巨冰正面砸实的威力；物攻给出投掷的狠度，体重给出冰块的份量。对手防御、相性与暴击在命中时另算。"
            }),
        /** 溅射副伤：攻击每比 50 多 1 加 0.18（上限 +20），体重每比 50 多 1 加 0.04（上限 +14）；夹在 24..80。 */
        splash: formula(
            F.base(45).plus(F.stat("attack").minus(50).times(0.18).clamp(-9, 20))
                .plus(F.body("weight").minus(50).times(0.04).clamp(-3, 14))
                .clamp(24, 80).round(1),
            "溅射副伤", {
                unit: "威力",
                description: "巨冰碎裂时，落点一圈里其他敌人吃到的次要伤害；比正中被砸实轻得多。对手防御、相性与暴击在命中时另算。"
            }),
        /** 碎裂半径：基础 2.2 格，体重每比 50 多 1 加 0.008（上限 +1.4），身高每比 1.4 多 0.5（上限 +2.4）；
         *  冰川 ×1.15 / 碎冰 ×0.9；夹在 1.6..4.2。 */
        shatterRadius: formula(
            F.base(2.2).plus(F.body("weight").minus(50).times(0.008).clamp(-0.4, 1.4))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.3, 2.4))
                .times(F.when(F.pref("glacier", text("worldcombat.skill.mountaingale.preference.glacier")), F.const(1.15), F.const(0.9)))
                .clamp(1.6, 4.2).round(2),
            "碎裂半径", {
                unit: "格",
                description: "巨冰落地时碎冰能扫到多大一圈；圈里的其他敌人吃溅射伤害。大个子、沉身体的碎得更开。"
            }),
        /** 击退距离：基础 0.8 格，体重每比 50 多 1 加 0.004（上限 +0.9）；夹在 0.4..2.0。 */
        shove: formula(
            F.base(0.8).plus(F.body("weight").minus(50).times(0.004).clamp(-0.2, 0.9)).clamp(0.4, 2.0).round(2),
            "击退距离", {
                unit: "格",
                description: "被巨冰正面砸实时，把目标沿飞行方向顶开多远；越重推得越远。"
            }),
        /** 投掷距离：基础 12 格，物攻每比 50 多 1 加 0.06（上限 +4），等级每 1 级加 0.05（上限 +2.5）；夹在 8..18。 */
        throwRange: formula(
            F.base(12).plus(F.stat("attack").minus(50).times(0.06).clamp(0, 4))
                .plus(F.level().minus(25).times(0.05).clamp(0, 2.5)).clamp(8, 18).round(2),
            "投掷距离", {
                unit: "格",
                description: "能把巨冰甩到多远，也是本招的实际射程来源；物攻与等级越高够得越远。"
            }),
        /** 飞行速度：基础 0.85 格/刻，速度每比 55 快 1 加 0.008（上限 +0.4），体重每比 50 多 1 减 0.003（下限 −0.25）；
         *  冰川 ×0.85；夹在 0.5..1.35。 */
        flightSpeed: formula(
            F.base(0.85).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.15, 0.4))
                .minus(F.body("weight").minus(50).times(0.003).clamp(0, 0.25))
                .times(F.when(F.pref("glacier", text("worldcombat.skill.mountaingale.preference.glacier")), F.const(0.85), F.const(1)))
                .clamp(0.5, 1.35).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "巨冰每刻飞多远；越重飞得越慢、越好躲，冰川式再慢一档。"
            }),
        /** 下落系数：基础 0.05 格/刻²，体重每比 50 多 1 加 0.0002（上限 +0.02）；冰川 ×1.15；夹在 0.03..0.085。 */
        arcFall: formula(
            F.base(0.05).plus(F.body("weight").minus(50).times(0.0002).clamp(0, 0.02))
                .times(F.when(F.pref("glacier", text("worldcombat.skill.mountaingale.preference.glacier")), F.const(1.15), F.const(1)))
                .clamp(0.03, 0.085).round(4),
            "下落系数", {
                unit: "格/刻²",
                description: "巨冰被重力拉下的快慢；数值越大越容易砸成高弧线，越小越平直。冰川式弧线更高。"
            }),
        /** 巨冰判定：基础 0.6 格，碰撞箱每比 1.4 高 1 格加 0.16；夹在 0.45..1.0。 */
        collisionRadius: formula(
            F.base(0.6).plus(F.body("height").minus(1.4).times(0.16).clamp(-0.1, 0.32)).clamp(0.45, 1.0).round(2),
            "巨冰判定", {
                unit: "格",
                description: "飞行中巨冰的横向判定半径；大个子抡出的冰块更粗，也更不容易被侧身让开。"
            }),
        /** 畏缩几率：基础 0.30，体重每比 50 多 1 加 0.0005（上限 +0.08）；夹在 0.16..0.44。 */
        flinchChance: percent(
            F.base(0.30).plus(F.body("weight").minus(50).times(0.0005).clamp(-0.05, 0.08)).clamp(0.16, 0.44),
            "畏缩几率", "被巨冰正面砸实时的畏缩几率；冰块越沉越容易把人砸懵。"),
        flinchTicks: ticks(18, "畏缩持续", "被砸懵的人在这段时间内无法开始新动作；这是全家最久的一档。"),
        /** 冰面停留：基础 100 刻，等级每 1 级加 0.8 刻；夹在 60..220。 */
        iceTicks: seconds(
            F.base(100).plus(F.level().times(0.8)).clamp(60, 220).round(0),
            "冰面停留", "落点结出的冰面与竖起的冰锥停留多久；到期原方块回来。"),
        /** 冰锥高度：基础 2 格，体重每比 50 多 1 加 0.006（上限 +2）；夹在 1..4。 */
        spikeHeight: formula(
            F.base(2).plus(F.body("weight").minus(50).times(0.006).clamp(0, 2)).clamp(1, 4).round(0),
            "冰锥高度", {
                unit: "格",
                description: "落点中心竖起多高的一簇冰锥；越重的个体砸出的冰簇越高，能当一小段掩体。"
            }),
        /** 起手：基础 16 刻，速度每比 55 快 1 减 0.03 刻；冰川 +5；夹在 10..24。 */
        tempo: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.03).clamp(-4, 4))
                .plus(F.when(F.pref("glacier", text("worldcombat.skill.mountaingale.preference.glacier")), F.const(5), F.const(0)))
                .clamp(10, 24).round(0),
            "起手", "从地里拔冰、抡起来到能脱手的时间；这是全家最长的前摇，也最容易被先手打断。"),
        /** 收招：基础 12 刻，速度每比 55 快 1 减 0.02 刻；冰川 +2；夹在 7..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 3))
                .plus(F.when(F.pref("glacier", text("worldcombat.skill.mountaingale.preference.glacier")), F.const(2), F.const(0)))
                .clamp(7, 18).round(0),
            "收招", "抡完稳住身形的收势；速度越快越利落。"),
        /** 冷却：基础 60 刻，速度每比 55 快 1 减 0.06 刻；冰川 +8；夹在 40..88。 */
        recharge: seconds(
            F.base(60).minus(F.stat("speed").minus(55).times(0.06).clamp(-6, 10))
                .plus(F.when(F.pref("glacier", text("worldcombat.skill.mountaingale.preference.glacier")), F.const(8), F.const(0)))
                .clamp(40, 88).round(0),
            "冷却", "两次投冰之间的等待；这是全家最长的冷却，换来的是最高的一记。")
    });

    stages("mountaingale", [
        { level: 40, values: { mass: 110, splash: 52 } },
        { level: 58, values: { mass: 122, splash: 60, shatterRadius: 2.8, spikeHeight: 3 } }
    ]);

    defineDamage("mountaingale", "mass", { defenceCoefficient: 0.005,
        rationale: "整块冰的重量砸下；按默认减伤规则结算。" });
    defineDamage("mountaingale", "splash", { defenceCoefficient: 0.006,
        rationale: "碎冰横扫，对护甲的穿透略强于正面重击。" });

    describe("mountaingale", [
        { key: "description.0", values: ["mass", "collisionRadius"] },
        { key: "description.1", values: ["throwRange","flightSpeed","arcFall"] },
        { key: "description.2", values: ["shatterRadius","shove","splash"] },
        { key: "description.3", values: ["flinchChance","flinchTicks"] },
        { key: "description.4", values: ["iceTicks", "spikeHeight"] },
        { key: "glacier.on", values: [], when: function (context) { return read(context.detail.values, ["glacier"]) === true; } },
        { key: "glacier.off", values: [], when: function (context) { return read(context.detail.values, ["glacier"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.mass", "tier.0.splash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.mass", "tier.1.splash", "tier.1.shatterRadius", "tier.1.spikeHeight"] }
    ]);
}
