/**
 * 尖刺加农炮 / spikecannon 的参数与伤害段。本族「2～5 连发硬物」的普通型。
 *
 * 原生事实：Normal／物理／单发威力 20／命中 100／PP 15／优先度 0／非接触；`multihit: [2, 5]`（连续攻击 2～5 次）；
 *   仅 6 位学习者（Cobblemon 1.8 / Showdown），是这一族里最罕见、最「炮」的一招。
 *   描述「向对手发射锐针进行攻击。连续攻击２～５次」。
 *
 * 翻译：把回合制的「2～5 连击」翻成**架炮直贯**——施法者稳住架势，把一排重型金属钉沿准线一发接一发打出去；
 *   每发穿透一线上的目标，并把命中的对象**顶退**。它是本族最慢、最重、射程最长的一梭，也是唯一会把人推开的。
 *   普通属性的中性金属感来自「机器／炮」而不是某种元素，符合它最少的 6 位学习者。
 *
 * 与同族／同侪分开：
 *   岩石爆击 —— 弧线重石，落点崩碎石；
 *   飞弹针   —— 追踪细针，钉在目标身上；
 *   冰锥     —— 直飞冰晶，碎在目标身上、冻住地面；
 *   尖刺加农炮 —— 直线重钉，穿一排、把人顶退；无追踪、无残留，只有「贯」与「推」。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   spike  单钉威力：物攻定钉的狠，等级定钉的熟。
 *   shots  钉数：物攻与等级决定这一梭有几发（夹 2..5；穿甲收在 3）。
 *   gap    间隔：速度决定炮响得多密（本族最慢）。
 *   velocity 钉速：物攻决定打得多快。
 *   radius 钉判定：体型高度定单发的碰撞大小。
 *   reach  射程：物攻与等级决定贯得多远（本族最长），也是本招的实际射程来源。
 *   spread 散布：速度与配置决定炮口偏角（原生 100 命中的翻译：几乎没有偏角）。
 *   pierce 穿透：等级与配置决定一发能贯穿几个人。
 *   knock  顶退：物攻与配置决定命中后把人推开几格。
 *   shards 碎钉量：物攻换算的碎屑量，驱动命中表现。
 *   tempo／aftercast／recharge：速度定节奏，穿甲更慢更长。
 *
 * 配置 `lance`（穿甲式）双向取舍（默认关）：
 *   开＝单钉威力 ×1.3、可贯穿 3 人、顶退 ×1.4；代价是钉数收在 3、射程 ×0.95、间隔 +2 刻、起手 +3 刻、冷却 +5 刻。
 *   关（连发式）＝钉数可到 5、射程更远、间隔更密、出手更快；代价是单钉威力 ×0.9、只贯穿 1~2 人、顶退更小。
 *
 * 伤害段 `spike` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在每发命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("spikecannon", {
        /** 单钉威力：基础 20；物攻每比 55 多 1 加 0.16（夹 −4..14）；等级每比 25 多 1 加 0.24（夹 0..7）；
         *  穿甲 ×1.3 / 连发 ×0.9；夹 12..52。 */
        spike: formula(
            F.base(20)
                .plus(F.stat("attack").minus(55).times(0.16).clamp(-4, 14))
                .plus(F.level().minus(25).times(0.24).clamp(0, 7))
                .times(F.when(F.pref("lance", text("worldcombat.skill.spikecannon.preference.lance")), F.const(1.3), F.const(0.9)))
                .clamp(12, 52).round(1),
            "单钉威力", {
                unit: "威力",
                description: "每一枚钉打上去的威力；总数乘起来才是这一梭的分量。物攻定狠度、等级让钉更熟。穿甲式更重。对手防御、相性与暴击在每发命中时另算。"
            }),
        /** 钉数：基础 2 + 物攻偏移[0,1.5] + 等级(≥25)偏移[0,1] + 速度偏移[0,0.8]；向下取整；
         *  穿甲上限 3、连发上限 5；夹 2..5。 */
        shots: formula(
            F.base(2)
                .plus(F.stat("attack").minus(55).times(0.012).clamp(0, 1.5))
                .plus(F.stat("speed").minus(55).times(0.006).clamp(0, 0.8))
                .plus(F.level().minus(25).times(0.02).clamp(0, 1))
                .floor()
                .clamp(F.when(F.pref("lance", text("worldcombat.skill.spikecannon.preference.lance")), F.const(2), F.const(2)),
                    F.when(F.pref("lance", text("worldcombat.skill.spikecannon.preference.lance")), F.const(3), F.const(5))),
            "钉数", {
                unit: "发",
                description: "这一梭打出几枚钉；物攻、速度与等级越高越多（原生 2～5）。穿甲式收在 3 发，连发式可到 5 发。"
            }),
        /** 间隔：基础 7 刻，速度每比 55 快 1 减 0.03（夹 −1..2）；穿甲 +2 / 连发 −1；夹 4..10。 */
        gap: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2))
                .plus(F.when(F.pref("lance", text("worldcombat.skill.spikecannon.preference.lance")), F.const(2), F.const(-1)))
                .clamp(4, 10).round(0),
            "间隔", "两发钉之间隔多久打出；速度越快越密，穿甲更沉、连发更急。它是本族里最慢的一梭。"),
        /** 钉速：基础 1.6，物攻每比 55 多 1 加 0.006（夹 −0.1..0.3）；夹 1.4..2.4。 */
        velocity: formula(
            F.base(1.6).plus(F.stat("attack").minus(55).times(0.006).clamp(-0.1, 0.3)).clamp(1.4, 2.4).round(2),
            "钉速", {
                unit: "格/刻",
                description: "每枚钉飞行的速度；物攻高的个体打得更急。"
            }),
        /** 钉判定：基础 0.2 格，碰撞箱每比 1.4 高 0.05（夹 −0.04..0.14）；夹 0.16..0.4。 */
        radius: formula(
            F.base(0.2).plus(F.body("height").minus(1.4).times(0.05).clamp(-0.04, 0.14)).clamp(0.16, 0.4).round(2),
            "钉判定", {
                unit: "格",
                description: "单发钉飞行与命中的判定大小；体型越高钉越粗。画出的钉长与它一致。"
            }),
        /** 射程：基础 8，物攻每比 55 多 1 加 0.04（夹 −1..3），等级每比 25 多 1 加 0.08（夹 0..2.5）；
         *  穿甲 ×0.95；夹 7..15。 */
        reach: formula(
            F.base(8)
                .plus(F.stat("attack").minus(55).times(0.04).clamp(-1, 3))
                .plus(F.level().minus(25).times(0.08).clamp(0, 2.5))
                .times(F.when(F.pref("lance", text("worldcombat.skill.spikecannon.preference.lance")), F.const(0.95), F.const(1.0)))
                .clamp(7, 15).round(1),
            "射程", {
                unit: "格",
                description: "钉能贯到多远；物攻与等级越高送得越远。它是本族里最长的一梭，也是本招的实际射程来源。"
            }),
        /** 散布：基础 1.2°，速度每比 55 快 1 加 0.01°（夹 0..0.8）；夹 0.5..2。 */
        spread: formula(
            F.base(1.2).plus(F.stat("speed").minus(55).times(0.01).clamp(0, 0.8)).clamp(0.5, 2).round(1),
            "散布", {
                unit: "°",
                description: "每发钉射出时的随机偏角；这是本族里最小的，因为原生命中 100。速度快的个体只多偏一点点。"
            }),
        /** 穿透：基础 1 + 等级每比 25 多 1 加 0.03（夹 0..1），向下取整；上限穿甲 3 / 连发 2；夹 1..3。 */
        pierce: formula(
            F.base(1).plus(F.level().minus(25).times(0.03).clamp(0, 1)).floor()
                .clamp(1, F.when(F.pref("lance", text("worldcombat.skill.spikecannon.preference.lance")), F.const(3), F.const(2))),
            "穿透", {
                unit: "人",
                description: "一发钉最多贯穿几个人；等级越高越多，穿甲式可到 3。贯穿的目标各吃一次伤害。"
            }),
        /** 顶退：基础 0.6 格，物攻每比 55 多 1 加 0.01（夹 −0.2..0.9）；穿甲 ×1.4；夹 0.4..2.2。 */
        knock: formula(
            F.base(0.6).plus(F.stat("attack").minus(55).times(0.01).clamp(-0.2, 0.9))
                .times(F.when(F.pref("lance", text("worldcombat.skill.spikecannon.preference.lance")), F.const(1.4), F.const(1.0)))
                .clamp(0.4, 2.2).round(2),
            "顶退", {
                unit: "格",
                description: "每发钉命中后把对象推开几格；物攻越高越重，穿甲式推得更远。它是本招独有的「贯」之外的另一半。"
            }),
        /** 碎钉量：基础 10，物攻每比 55 多 1 加 0.14（夹 −3..12）；夹 8..28。 */
        shards: formula(
            F.base(10).plus(F.stat("attack").minus(55).times(0.14).clamp(-3, 12)).clamp(8, 28).round(0),
            "碎钉量", {
                unit: "片",
                description: "每发钉撞上目标时崩出的金属屑数量，由物攻换算；它驱动命中的碎屑表现，不是独立伤害。"
            }),
        /** 起手：基础 11 刻，速度每比 55 快 1 减 0.05（夹 −2..3）；穿甲 +3；夹 5..16。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 3))
                .plus(F.when(F.pref("lance", text("worldcombat.skill.spikecannon.preference.lance")), F.const(3), F.const(0)))
                .clamp(5, 16).round(0),
            "起手", "架稳炮身、装上第一发钉的时间；速度越快越短，穿甲要多装一下。它是本族里最长的起手。"),
        /** 收招：基础 9 刻，速度每比 55 快 1 减 0.03（夹 −1..2）；夹 5..12。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(5, 12).round(0),
            "收招", "这一梭打完、卸下炮身的时间；快的个体更利落。"),
        /** 冷却：基础 32 刻，速度每比 55 快 1 减 0.05（夹 −3..5）；穿甲 +5 / 连发 −4；夹 18..48。 */
        recharge: seconds(
            F.base(32).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 5))
                .plus(F.when(F.pref("lance", text("worldcombat.skill.spikecannon.preference.lance")), F.const(5), F.const(-4)))
                .clamp(18, 48).round(0),
            "冷却", "再装一梭钉前等待多久；穿甲更长、连发更短。")
    });

    stages("spikecannon", [
        { level: 30, values: { spike: 25, shots: 3 } },
        { level: 44, values: { spike: 30, reach: 12 } }
    ]);

    defineDamage("spikecannon", "spike", {});

    describe("spikecannon", [
        { key: "description.0", values: ["spike","shots"] },
        { key: "description.1", values: ["gap","velocity","reach","spread"] },
        { key: "description.2", values: ["radius","pierce","knock"] },
        { key: "lance.on", values: [], when: function (context) { return read(context.detail.values, ["lance"]) === true; } },
        { key: "lance.off", values: [], when: function (context) { return read(context.detail.values, ["lance"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spike", "tier.0.shots"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spike", "tier.1.reach"] }
    ]);
}
