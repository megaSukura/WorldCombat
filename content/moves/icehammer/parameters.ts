/**
 * 冰锤 / icehammer —— 参数与伤害段。本族「转体抡击」的单体重砸成员之一，臂锤的冰属性孪生。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Ice／物理／威力 100／命中 90／PP 10／优先度 0／接触；
 *   `punch` 标记；`self: { boosts: { spe: -1 } }`（命中后自身速度 −1）、无次要效果；4 位学习者。
 *   描述「挥舞强力而沉重的拳头，给予对手伤害。自己的速度会降低。」
 *
 * 翻译：与臂锤同一记重砸的骨架，换成**裹着一层厚冰垂直下砸**——拳面结出厚冰，砸下时冰壳在目标身上炸开，
 *   把目标冻得一滞（挂上本单元状态 `world_combat:icehammer_chilled`，共享身份 `world_combat:status/chilled`，
 *   别的单元以后就能只问「冰没冰缓」），落地处结出一片会留一会儿的薄冰；自己同样因惯性速度 −1 级。
 *   对已经冰缓的目标，冰壳碎得更彻底，伤害略高——共享身份回流进这招自己的公式。
 *
 * 与臂锤分开：臂锤是斗气横挥、砸退更远、地面留裂痕；冰锤是垂直下砸、砸退小、留冰面并给目标冰缓。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   hammer     砸击威力：物攻定拳面、**体重**定下砸份量、等级定发力；目标已冰缓时 ×1.15。
 *   reach      出手距离：身高给臂长、速度给上前的半步。
 *   knock      砸退距离：垂直下砸的推力比横挥小，物攻给力、**目标体重**抵掉一部分。
 *   chillTicks 冰缓时长：等级与物攻决定冻多久；积冰式 ×1.4。
 *   frostRadius 冰面半径：身高决定冰面铺多开；积冰式 ×1.25。
 *   frostTicks 冰面时长：等级决定薄冰留多久；积冰式 ×1.3。
 *   shards     冰屑数：体重与物攻决定碎冰密度（也是画面发射量的来源）。
 *   speedLoss  自身速度下降：原生固定 1 级，是无法回避的代价。
 *   tempo/aftercast/recharge：速度定时序、等级定熟练度，积冰式更慢。
 *
 * 配置 `glaciate`（积冰式，默认关）双向取舍：开＝冰缓更久、冰面更大更久，代价是威力 ×0.92、起手 +2 刻、
 *   冷却 +6 刻；关（碎冰式）＝一击更重、出手更快，但冰缓短、冰面小。两向各有适用局面。
 *
 * 伤害段 `hammer` 与参数同名，走共享换算（原始类别 Physical），接触＋拳击由 `punch` 标记落定。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const icehammerMass: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("icehammer", {
        /** 砸击威力：基础 95；物攻每比 60 多 1 加 0.5（夹 −14..30）；体重每比 300hg 多 1hg 加 0.018（夹 −6..15）；
         *  等级每比 30 高 1 加 0.3（夹 −6..14）；目标已冰缓 ×1.15；积冰 ×0.92；夹 58..150。 */
        hammer: formula(
            F.base(95)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-14, 30))
                .plus(F.body("weight").minus(300).times(0.018).clamp(-6, 15))
                .plus(F.level().minus(30).times(0.3).clamp(-6, 14))
                .times(F.when(F.target("status.chilled", text("worldcombat.skill.icehammer.value.targetChilled")), F.const(1.15), F.const(1.0)))
                .times(F.when(F.pref("glaciate", text("worldcombat.skill.icehammer.preference.glaciate")), F.const(0.92), F.const(1.0)))
                .clamp(58, 150).round(1),
            "砸击威力", {
                unit: "威力",
                description: "裹冰重锤垂直下砸的基础威力；物攻定拳面、身体越沉份量越大、等级越高越稳。已经冰缓的目标冰壳更脆、再吃一成半；积冰式分薄一点。对手防御、相性与暴击在命中时另算。"
            }),
        /** 出手距离：基础 2.6 格；身高每比 1.4 高 1 格加 0.45（夹 −0.25..0.7）；速度每比 55 快 1 加 0.006（夹 −0.15..0.35）；夹 2.2..3.6。 */
        reach: formula(
            F.base(2.6)
                .plus(F.body("height").minus(1.4).times(0.45).clamp(-0.25, 0.7))
                .plus(F.stat("speed").minus(55).times(0.006).clamp(-0.15, 0.35))
                .clamp(2.2, 3.6).round(2),
            "出手距离", {
                unit: "格",
                description: "举冰锤够到多近才砸得实；身高给臂长、速度给上前的半步。它也是本招的实际射程来源。"
            }),
        /** 砸退距离：基础 0.5 格；物攻每比 60 多 1 加 0.006（夹 −0.15..0.5）；目标体重每比 300hg 重 1hg 减 0.0004（最多减 0.5）；
         *  夹 0.2..1.6。 */
        knock: formula(
            F.base(0.5)
                .plus(F.stat("attack").minus(60).times(0.006).clamp(-0.15, 0.5))
                .minus(icehammerMass.minus(300).times(0.0004).clamp(0, 0.5))
                .clamp(0.2, 1.6).round(2),
            "砸退距离", {
                unit: "格",
                description: "垂直下砸把目标砸开多远；比横挥的臂锤小，物攻越强推得越远、目标越重越推不动。"
            }),
        /** 冰缓时长：基础 100 刻；等级每比 30 高 1 加 0.7（夹 0..50）；物攻每比 60 多 1 加 0.15（夹 −5..20）；积冰 ×1.4；夹 60..320。 */
        chillTicks: seconds(
            F.base(100)
                .plus(F.level().minus(30).times(0.7).clamp(0, 50))
                .plus(F.stat("attack").minus(60).times(0.15).clamp(-5, 20))
                .times(F.when(F.pref("glaciate", text("worldcombat.skill.icehammer.preference.glaciate")), F.const(1.4), F.const(1.0)))
                .clamp(60, 320).round(0),
            "冰缓时长", "目标带上冰缓身份多久（同时稍慢）；等级与物攻越高冻得越久，积冰式更长。"),
        /** 冰面半径：基础 1.5 格；身高每比 1.4 高 1 格加 0.35（夹 −0.2..0.9）；积冰 ×1.25；夹 1.2..2.8。 */
        frostRadius: formula(
            F.base(1.5)
                .plus(F.body("height").minus(1.4).times(0.35).clamp(-0.2, 0.9))
                .times(F.when(F.pref("glaciate", text("worldcombat.skill.icehammer.preference.glaciate")), F.const(1.25), F.const(1.0)))
                .clamp(1.2, 2.8).round(2),
            "冰面半径", {
                unit: "格",
                description: "落点结起的薄冰铺多开；体型越高越宽，积冰式更大。画出的冰圈就是这个半径。"
            }),
        /** 冰面时长：基础 60 刻；等级每比 30 高 1 加 0.6（夹 0..40）；积冰 ×1.3；夹 40..150。 */
        frostTicks: seconds(
            F.base(60)
                .plus(F.level().minus(30).times(0.6).clamp(0, 40))
                .times(F.when(F.pref("glaciate", text("worldcombat.skill.icehammer.preference.glaciate")), F.const(1.3), F.const(1.0)))
                .clamp(40, 150).round(0),
            "冰面时长", "落点的薄冰留多久；到期原方块回来。积冰式留得更久。"),
        /** 冰屑数：基础 12；体重每比 300hg 多 1hg 加 0.02（夹 −3..12）；物攻每比 60 多 1 加 0.06（夹 −3..10）；夹 8..38 并向下取整。 */
        shards: formula(
            F.base(12)
                .plus(F.body("weight").minus(300).times(0.02).clamp(-3, 12))
                .plus(F.stat("attack").minus(60).times(0.06).clamp(-3, 10))
                .clamp(8, 38).floor(),
            "冰屑数", {
                unit: "片",
                description: "冰壳碎裂时崩出的冰屑数量；身体越沉、物攻越高碎得越密，直接驱动画面的发射量。"
            }),
        /** 自身速度下降级：原生固定 1 级；夹 1..6。 */
        speedLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身速度下降", {
                unit: "级",
                description: "垂直下砸后自身速度下降的能力等级；原生固定 1 级，是无法回避的代价。"
            }),
        /** 起手：基础 15 刻；速度每比 55 快 1 减 0.04（夹 −2..3）；积冰 +2；夹 9..21。 */
        tempo: seconds(
            F.base(15).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3))
                .plus(F.when(F.pref("glaciate", text("worldcombat.skill.icehammer.preference.glaciate")), F.const(2), F.const(0)))
                .clamp(9, 21).round(0),
            "起手", "把冰在拳面凝厚、举起来再砸下的时间；速度越快越短，积冰式更久。这段时间里可以被集火打断。"),
        /** 收招：基础 11 刻；速度每比 55 快 1 减 0.03（夹 −1.5..2.5）；积冰 +2；夹 6..18。 */
        aftercast: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("glaciate", text("worldcombat.skill.icehammer.preference.glaciate")), F.const(2), F.const(0)))
                .clamp(6, 18).round(0),
            "收招", "砸完把冰锤收回、重新站稳的时间；积冰式多收一下。"),
        /** 冷却：基础 36 刻；速度每比 55 快 1 减 0.06（夹 −3..6）；积冰 +6；夹 22..54。 */
        recharge: seconds(
            F.base(36).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 6))
                .plus(F.when(F.pref("glaciate", text("worldcombat.skill.icehammer.preference.glaciate")), F.const(6), F.const(0)))
                .clamp(22, 54).round(0),
            "冷却", "两次裹冰重砸之间等多久；速度越快回气越快，积冰式缓得更久。")
    });

    stages("icehammer", [
        { level: 37, values: { hammer: 106, shards: 16 } },
        { level: 52, values: { hammer: 118, frostRadius: 1.8 } }
    ]);

    defineDamage("icehammer", "hammer", {}, { contact: true, punch: true });

    describe("icehammer", [
        { key: "description.0", values: ["hammer", "reach"] },
        { key: "description.1", values: ["knock", "speedLoss"] },
        { key: "description.2", values: ["chillTicks", "shards"] },
        { key: "glaciate.on", values: ["frostRadius", "frostTicks"], when: function (context) { return read(context.detail.values, ["glaciate"]) === true; } },
        { key: "glaciate.off", values: [], when: function (context) { return read(context.detail.values, ["glaciate"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.hammer", "tier.0.shards"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.hammer", "tier.1.frostRadius"] }
    ]);
}
