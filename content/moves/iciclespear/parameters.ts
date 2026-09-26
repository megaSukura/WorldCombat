/**
 * 冰锥 / iciclespear 的参数与伤害段。本族「2～5 连发硬物」的冰型。
 *
 * 原生事实：Ice／物理／单发威力 25／命中 100／PP 30／优先度 0／非接触；`multihit: [2, 5]`（连续攻击 2～5 次）；
 *   48 位学习者（Cobblemon 1.8 / Showdown）。描述「向对手发射锋利的冰柱进行攻击。连续攻击2～5次」。
 *   本族里命中 100、PP 最多，是「最稳的一梭」。
 *
 * 翻译：把回合制的「2～5 连击」翻成**碎冰齐排**——在身前横排凝出一排平行冰锥，同一刻左右错位射出；
 *   每根首次碰实体各结算一次 `spear` 物理伤害，并**碎在目标身上**散出冰屑；命中让目标霜寒、移速变慢。
 *   命中 100 翻成「方向平行」：整排同向直飞、不追不散，近处宽目标会被多根同时穿中，这正是它的覆盖来源。
 *   取消原「每落点换雪块」：落点只留会消散的冰屑，霜寒只随实际命中。
 *
 * 与同族／同侪分开：
 *   岩石爆击 —— 弧线重石，真撞点崩起碎石尘；
 *   飞弹针   —— 追踪细针，钉在目标身上；
 *   尖刺加农炮 —— 直线重钉，穿一排、把人顶开；
 *   冰锥     —— 齐排平行同发，靠整排宽度覆盖宽目标。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   spear  单锥威力：特攻塑造冰晶的锋度，等级定冰的硬度。
 *   shots  锥数：物攻与等级决定这一梭有几根（夹 2..5；霜附收在 3）。
 *   velocity 锥速：速度决定冰锥飞得多快。
 *   radius 冰锥判定：体型高度定单根的碰撞大小，也决定整排的横向间距。
 *   reach  射程：特攻与等级决定能打多远，也是本招的实际射程来源。
 *   chill  霜寒时长：等级与配置决定减速维持多久。
 *   frost  冰屑范围：等级与配置决定命中处冰屑散开的可见范围。
 *   shards 碎冰量：特攻换算的碎屑量，驱动命中表现。
 *   tempo／aftercast／recharge：速度定节奏，霜附更慢更长。
 *
 * 配置 `rime`（霜附式）双向取舍（默认关）：
 *   开＝每根命中的霜寒振幅 +1（减速等级高一档）、霜寒时长 ×1.6、冰屑范围 ×1.3；代价是锥数收在 3、
 *       单锥威力 ×0.9、起手 +2 刻、冷却 +4 刻。
 *   关（纯碎式）＝锥数可到 5、单锥威力 ×1.1、冷却 −4 刻；代价是只留最浅的霜寒与更小的冰屑范围。
 *
 * 状态 `world_combat:iciclespear_chill`（本单元 startup 注册）只借共享身份 `world_combat:status/chill`，
 *   行为写在 rules.ts：按振幅施加对应等级的减速。宝可梦身上不自动同步成原生异常，这是本招的选择。
 *
 * 伤害段 `spear` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在每根命中时另算。
 */
namespace PokemonSkills {
    export const icicleSpearChill = "world_combat:iciclespear_chill";
    export const icicleSpearScene = "world_combat:move_iciclespear";

    actionParameters.define("iciclespear", {
        /** 单锥威力：基础 25；特攻每比 55 多 1 加 0.18（夹 −5..15）；等级每比 25 多 1 加 0.28（夹 0..8）；
         *  霜附 ×0.9 / 纯碎 ×1.1；夹 15..60。 */
        spear: formula(
            F.base(25)
                .plus(F.stat("specialAttack").minus(55).times(0.18).clamp(-5, 15))
                .plus(F.level().minus(25).times(0.28).clamp(0, 8))
                .times(F.when(F.pref("rime", text("worldcombat.skill.iciclespear.preference.rime")), F.const(0.9), F.const(1.1)))
                .clamp(15, 60).round(1),
            "单锥威力", {
                unit: "威力",
                description: "每一根冰锥扎上去的威力；总数乘起来才是这一梭的分量。特攻塑造冰晶的锋度，等级定冰的硬度。纯碎式更锋利。对手防御、相性与暴击在每根命中时另算。"
            }),
        /** 锥数：基础 2 + 物攻偏移[0,1.5] + 等级(≥25)偏移[0,1] + 速度偏移[0,1]；向下取整；
         *  霜附上限 3、纯碎上限 5；夹 2..5。 */
        shots: formula(
            F.base(2)
                .plus(F.stat("attack").minus(55).times(0.012).clamp(0, 1.5))
                .plus(F.stat("speed").minus(55).times(0.008).clamp(0, 1))
                .plus(F.level().minus(25).times(0.02).clamp(0, 1))
                .floor()
                .clamp(F.when(F.pref("rime", text("worldcombat.skill.iciclespear.preference.rime")), F.const(2), F.const(2)),
                    F.when(F.pref("rime", text("worldcombat.skill.iciclespear.preference.rime")), F.const(3), F.const(5))),
            "锥数", {
                unit: "根",
                description: "这一梭射出几根冰锥；物攻、速度与等级越高越多（原生 2～5）。霜附形态收在 3 根，纯碎形态可到 5 根。"
            }),
        /** 锥速：基础 1.9，速度每比 55 快 1 加 0.012（夹 −0.2..0.5）；夹 1.5..2.8。 */
        velocity: formula(
            F.base(1.9).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.2, 0.5)).clamp(1.5, 2.8).round(2),
            "锥速", {
                unit: "格/刻",
                description: "每根冰锥飞行的速度；速度快的个体喷得更急。"
            }),
        /** 冰锥判定：基础 0.16 格，碰撞箱每比 1.4 高 0.04（夹 −0.03..0.1）；夹 0.12..0.3。 */
        radius: formula(
            F.base(0.16).plus(F.body("height").minus(1.4).times(0.04).clamp(-0.03, 0.1)).clamp(0.12, 0.3).round(2),
            "冰锥判定", {
                unit: "格",
                description: "单根冰锥飞行与命中的判定大小；体型越高冰锥越粗。画出的锥长与它一致。"
            }),
        /** 射程：基础 8，特攻每比 55 多 1 加 0.03（夹 −1..2.5），等级每比 25 多 1 加 0.05（夹 0..1.5）；夹 6..13。 */
        reach: formula(
            F.base(8)
                .plus(F.stat("specialAttack").minus(55).times(0.03).clamp(-1, 2.5))
                .plus(F.level().minus(25).times(0.05).clamp(0, 1.5))
                .clamp(6, 13).round(1),
            "射程", {
                unit: "格",
                description: "冰锥能打到多远；特攻与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 霜寒时长：基础 60 刻，等级每比 25 多 1 加 1.2（夹 0..50）；霜附 ×1.6；夹 50..170。 */
        chill: seconds(
            F.base(60).plus(F.level().minus(25).times(1.2).clamp(0, 50))
                .times(F.when(F.pref("rime", text("worldcombat.skill.iciclespear.preference.rime")), F.const(1.6), F.const(1.0)))
                .clamp(50, 170).round(0),
            "霜寒时长", "每根冰锥命中后减速维持多久；每根新锥都会把时间刷新。霜附维持得更久。"),
        /** 冰屑范围：基础 1.0 格，等级每比 25 多 1 加 0.02（夹 0..0.7）；霜附 ×1.3；夹 0.8..2.2。 */
        frost: formula(
            F.base(1.0).plus(F.level().minus(25).times(0.02).clamp(0, 0.7))
                .times(F.when(F.pref("rime", text("worldcombat.skill.iciclespear.preference.rime")), F.const(1.3), F.const(1.0)))
                .clamp(0.8, 2.2).round(2),
            "冰屑范围", {
                unit: "格",
                description: "冰锥命中时冰屑散开的可见范围；等级越高、霜附式越大。它只影响表现，不改动地面方块。"
            }),
        /** 碎冰量：基础 12，特攻每比 55 多 1 加 0.16（夹 −4..14）；夹 8..32。 */
        shards: formula(
            F.base(12).plus(F.stat("specialAttack").minus(55).times(0.16).clamp(-4, 14)).clamp(8, 32).round(0),
            "碎冰量", {
                unit: "片",
                description: "每根冰锥撞碎时崩出的冰屑数量，由特攻换算；它驱动命中的碎屑表现，不是独立伤害。"
            }),
        /** 起手：基础 8 刻，速度每比 55 快 1 减 0.04（夹 −1.5..2.5）；霜附 +2；夹 4..13。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("rime", text("worldcombat.skill.iciclespear.preference.rime")), F.const(2), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "凝出第一根冰锥、喷出去的时间；速度越快越短，霜附要多凝一下。"),
        /** 收招：基础 6 刻，速度每比 55 快 1 减 0.03（夹 −1..2）；夹 3..9。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(3, 9).round(0),
            "收招", "这一梭喷完、收冰的时间；快的个体更利落。"),
        /** 冷却：基础 24 刻，速度每比 55 快 1 减 0.05（夹 −3..5）；霜附 +4 / 纯碎 −4；夹 14..38。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 5))
                .plus(F.when(F.pref("rime", text("worldcombat.skill.iciclespear.preference.rime")), F.const(4), F.const(-4)))
                .clamp(14, 38).round(0),
            "冷却", "再凝一梭冰锥前等待多久；霜附更长、纯碎更短。")
    });

    stages("iciclespear", [
        { level: 28, values: { spear: 31, shots: 3 } },
        { level: 44, values: { spear: 38, reach: 10 } }
    ]);

    defineDamage("iciclespear", "spear", {});

    describe("iciclespear", [
        { key: "description.0", values: ["spear","shots"] },
        { key: "description.1", values: ["velocity", "reach"] },
        { key: "description.2", values: ["radius","chill"] },
        { key: "rime.on", values: [], when: function (context) { return read(context.detail.values, ["rime"]) === true; } },
        { key: "rime.off", values: [], when: function (context) { return read(context.detail.values, ["rime"]) !== true; } },
        { key: "timing", values: ["range","tempo","aftercast","pp","recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spear", "tier.0.shots"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spear", "tier.1.reach"] }
    ]);
}
