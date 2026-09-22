/**
 * 飞弹针 / pinmissile 的参数与伤害段。本族「2～5 连发硬物」的虫型。
 *
 * 原生事实：Bug／物理／单发威力 25／命中 95／PP 20／优先度 0／非接触；`multihit: [2, 5]`（连续攻击 2～5 次）；
 *   49 位学习者（Cobblemon 1.8 / Showdown）。描述「向对手发射锐针进行攻击。连续攻击2～5次」。
 *
 * 翻译：把回合制的「2～5 连击」翻成**追身针雨**——施法者抖开一身细针，一根接一根带着追踪飞向目标；
 *   每根扎进身上留一次 `quill` 物理伤害，并且**钉在那里不拔**。钉得越多，拖拽越重（减速）。
 *   本族唯一的追踪连发：命中率高、单根最轻、出手最快、PP 最多，卖的是「钉满一身」。
 *
 * 与同族／同侪分开：
 *   岩石爆击 —— 弧线重石，落点崩碎石；
 *   冰锥     —— 直飞冰晶，碎在目标身上、冻住地面；
 *   尖刺加农炮 —— 直线重钉，穿一排、把人顶开；
 *   飞弹针   —— 细针带追踪、钉在目标身上越钉越慢，且是本族唯一会留下持续状态的连发。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   quill   单针威力：物攻定针刺的深，等级定针的硬。
 *   shots   针数：速度、物攻与等级决定这一梭有几根（夹 2..5；倒钩收在 3）。
 *   gap     间隔：速度决定针与针之间飞得多密（本族最快）。
 *   velocity 针速：速度决定针飞得多快。
 *   turn    追踪：等级决定针每刻能拐多少度。
 *   radius  针判定：体型高度定单根的碰撞大小。
 *   reach   射程：速度与等级决定能追多远，也是本招的实际射程来源。
 *   spread  散布：速度与配置决定起手的偏角。
 *   pins    钉数上限：等级决定身上最多钉几根，也是状态振幅的上限。
 *   stick   钉住时长：等级与配置决定被钉者减速维持多久。
 *   bristles 针量：物攻换算的碎屑量，驱动命中表现。
 *   tempo／aftercast／recharge：速度定节奏，倒钩更慢更长。
 *
 * 配置 `barbed`（倒钩针）双向取舍（默认关）：
 *   开＝单针威力 ×1.25、钉住时长 ×1.5、散布 ×0.7；代价是针数收在 3、针速 ×0.92、间隔 +1 刻、起手 +2 刻、冷却 +4 刻。
 *   关（速射针）＝针数可到 5、间隔更密、针速更快；代价是单针威力 ×0.9、钉住更短、散布 ×1.15。
 *
 * 状态 `world_combat:pinmissile_quills`（本单元 startup 注册）只借共享身份 `world_combat:status/quills`，
 *   行为写在 rules.ts：按振幅施加对应等级的减速。宝可梦身上不自动同步成原生异常，这是本招的选择。
 *
 * 伤害段 `quill` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在每根命中时另算。
 */
namespace PokemonSkills {
    export const pinMissileQuills = "world_combat:pinmissile_quills";
    export const pinMissileScene = "world_combat:move_pinmissile";

    actionParameters.define("pinmissile", {
        /** 单针威力：基础 25；物攻每比 55 多 1 加 0.16（夹 −5..13）；等级每比 25 多 1 加 0.25（夹 0..7）；
         *  倒钩 ×1.25 / 速射 ×0.9；夹 13..55。 */
        quill: formula(
            F.base(25)
                .plus(F.stat("attack").minus(55).times(0.16).clamp(-5, 13))
                .plus(F.level().minus(25).times(0.25).clamp(0, 7))
                .times(F.when(F.pref("barbed", text("worldcombat.skill.pinmissile.preference.barbed")), F.const(1.25), F.const(0.9)))
                .clamp(13, 55).round(1),
            "单针威力", {
                unit: "威力",
                description: "每一根针刺进去的威力；总数乘起来才是这一梭的分量。物攻定深浅、等级定硬度。倒钩更狠。对手防御、相性与暴击在每根命中时另算。"
            }),
        /** 针数：基础 2 + 速度偏移[0,1.8] + 物攻偏移[0,1.2] + 等级(≥25)偏移[0,1]；向下取整；
         *  倒钩上限 3、速射上限 5；夹 2..5。 */
        shots: formula(
            F.base(2)
                .plus(F.stat("speed").minus(55).times(0.015).clamp(0, 1.8))
                .plus(F.stat("attack").minus(55).times(0.01).clamp(0, 1.2))
                .plus(F.level().minus(25).times(0.02).clamp(0, 1))
                .floor()
                .clamp(F.when(F.pref("barbed", text("worldcombat.skill.pinmissile.preference.barbed")), F.const(2), F.const(2)),
                    F.when(F.pref("barbed", text("worldcombat.skill.pinmissile.preference.barbed")), F.const(3), F.const(5))),
            "针数", {
                unit: "根",
                description: "这一梭射出几根针；速度、物攻与等级越高越多（原生 2～5）。倒钩形态收在 3 根，速射形态可到 5 根。"
            }),
        /** 间隔：基础 3 刻，速度每比 55 快 1 减 0.02（夹 −0.8..1.2）；倒钩 +1 / 速射 −1；夹 1..5。 */
        gap: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.2))
                .plus(F.when(F.pref("barbed", text("worldcombat.skill.pinmissile.preference.barbed")), F.const(1), F.const(-1)))
                .clamp(1, 5).round(0),
            "间隔", "两根针之间隔多久射出；速度越快越密，速射更急、倒钩稍缓。"),
        /** 针速：基础 2.1，速度每比 55 快 1 加 0.012（夹 −0.2..0.5）；倒钩 ×0.92；夹 1.6..3.0。 */
        velocity: formula(
            F.base(2.1).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.2, 0.5))
                .times(F.when(F.pref("barbed", text("worldcombat.skill.pinmissile.preference.barbed")), F.const(0.92), F.const(1.0)))
                .clamp(1.6, 3.0).round(2),
            "针速", {
                unit: "格/刻",
                description: "每根针飞行的速度；速度快的个体喷得更急。它是本族里飞得最快的。"
            }),
        /** 追踪：基础 16°/刻，等级每比 25 多 1 加 0.3（夹 0..10）；夹 10..30。 */
        turn: formula(
            F.base(16).plus(F.level().minus(25).times(0.3).clamp(0, 10)).clamp(10, 30).round(0),
            "追踪", {
                unit: "°/刻",
                description: "每根针每刻能拐多少度；等级越高追得越紧。这就是「追身」的来源。"
            }),
        /** 针判定：基础 0.13 格，碰撞箱每比 1.4 高 0.03（夹 −0.02..0.08）；夹 0.1..0.24。 */
        radius: formula(
            F.base(0.13).plus(F.body("height").minus(1.4).times(0.03).clamp(-0.02, 0.08)).clamp(0.1, 0.24).round(2),
            "针判定", {
                unit: "格",
                description: "单根针飞行与命中的判定大小；体型越高针越大。画出的针长与它一致。"
            }),
        /** 射程：基础 8，速度每比 55 快 1 加 0.03（夹 −1..2.5），等级每比 25 多 1 加 0.05（夹 0..1.5）；夹 6..13。 */
        reach: formula(
            F.base(8)
                .plus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2.5))
                .plus(F.level().minus(25).times(0.05).clamp(0, 1.5))
                .clamp(6, 13).round(1),
            "射程", {
                unit: "格",
                description: "针能追到多远；速度与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 散布：基础 1.4°，速度每比 55 快 1 加 0.02°（夹 0..1.6）；倒钩 ×0.7 / 速射 ×1.15；夹 0.8..4。 */
        spread: formula(
            F.base(1.4).plus(F.stat("speed").minus(55).times(0.02).clamp(0, 1.6))
                .times(F.when(F.pref("barbed", text("worldcombat.skill.pinmissile.preference.barbed")), F.const(0.7), F.const(1.15)))
                .clamp(0.8, 4).round(1),
            "散布", {
                unit: "°",
                description: "每根针射出时的随机偏角；速度快的个体喷得散，但有追踪兜底。倒钩收得更紧、速射更开。"
            }),
        /** 钉数上限：基础 3 + 等级每比 25 多 1 加 0.25（夹 0..3）；夹 3..6。 */
        pins: formula(
            F.base(3).plus(F.level().minus(25).times(0.25).clamp(0, 3)).clamp(3, 6).round(0),
            "钉数上限", {
                unit: "根",
                description: "目标身上最多同时钉几根；等级越高越多。它是钉刺状态振幅的上限，也是每秒减速等级的来源。"
            }),
        /** 钉住时长：基础 60 刻，等级每比 25 多 1 加 1.5（夹 0..60）；倒钩 ×1.5；夹 50..180。 */
        stick: seconds(
            F.base(60).plus(F.level().minus(25).times(1.5).clamp(0, 60))
                .times(F.when(F.pref("barbed", text("worldcombat.skill.pinmissile.preference.barbed")), F.const(1.5), F.const(1.0)))
                .clamp(50, 180).round(0),
            "钉住时长", "每根针钉住后减速维持多久；每根新针都会把时间刷新。倒钩钉得更久。"),
        /** 针量：基础 12，物攻每比 55 多 1 加 0.16（夹 −4..14）；夹 8..30。 */
        bristles: formula(
            F.base(12).plus(F.stat("attack").minus(55).times(0.16).clamp(-4, 14)).clamp(8, 30).round(0),
            "针量", {
                unit: "根",
                description: "命中时崩出的针屑数量，由物攻换算；它驱动命中的碎屑表现，不是独立伤害。"
            }),
        /** 起手：基础 7 刻，速度每比 55 快 1 减 0.04（夹 −1.5..2.5）；倒钩 +2；夹 3..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("barbed", text("worldcombat.skill.pinmissile.preference.barbed")), F.const(2), F.const(0)))
                .clamp(3, 12).round(0),
            "起手", "抖开一身针、射出第一根的时间；速度越快越短，倒钩要多抖一下。"),
        /** 收招：基础 6 刻，速度每比 55 快 1 减 0.03（夹 −1..2）；夹 3..9。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(3, 9).round(0),
            "收招", "这一梭射完、收回针架的时间；快的个体更利落。"),
        /** 冷却：基础 22 刻，速度每比 55 快 1 减 0.05（夹 −3..5）；倒钩 +4 / 速射 −4；夹 12..34。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 5))
                .plus(F.when(F.pref("barbed", text("worldcombat.skill.pinmissile.preference.barbed")), F.const(4), F.const(-4)))
                .clamp(12, 34).round(0),
            "冷却", "再抖一梭针前等待多久；倒钩更长、速射更短。")
    });

    stages("pinmissile", [
        { level: 28, values: { quill: 31, shots: 3 } },
        { level: 44, values: { quill: 38, reach: 10 } }
    ]);

    defineDamage("pinmissile", "quill", {});

    describe("pinmissile", [
        { key: "description.0", values: ["quill", "shots"] },
        { key: "description.1", values: ["gap", "velocity", "reach", "turn"] },
        { key: "description.2", values: ["radius", "pins", "stick"] },
        { key: "barbed.on", values: [], when: function (context) { return read(context.detail.values, ["barbed"]) === true; } },
        { key: "barbed.off", values: [], when: function (context) { return read(context.detail.values, ["barbed"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.quill", "tier.0.shots"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.quill", "tier.1.reach"] }
    ]);
}
