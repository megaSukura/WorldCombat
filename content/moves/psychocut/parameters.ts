/**
 * 精神利刃 / psychocut 的参数与数值来源。
 *
 * 原生事实：Psychic／物理／威力 70／命中 100／PP 20／非接触、切斩（slicing）／critRatio 2（暴击率高出一档；
 * Cobblemon 1.8，共 135 位直接学习者）。原生描述：「用实体化的心之利刃劈开对手，容易击中要害」。
 *
 * 翻译：把「实体化的心之利刃」落成一轮**掷出去的月牙**——在身前凝出一把偏紫的心之刃，脱手后自己
 * 修正方向追向目标；命中处沿竖直面切出一个十字，把目标钉在交点上，刃风扫到近旁的其他敌人也各挨一记。
 * 它是本族里唯一「刃离开施法者、还会拐弯追人」的一击。「容易击中要害」沿用原生 critRatio 2 的共享结算。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   blade    刃威力：物攻定刃口，特攻定「心之刃」凝得多实。
 *   flight   飞行速度：速度定刃飞得多快（快则更难被读、追人更急）。
 *   reach    射程：等级定心之刃能撑多远不散。
 *   arc      十字半径：身高定命中处那个十字有多大，也是刃风波及的范围。
 *   guide    追踪转向：速度定每刻最多校正几度，快的个体拐得更急。
 *   echo     波及比例：等级定刃风扫到近旁敌人时保留几成威力。
 *   radius   刃判定半径：碰撞箱宽度定刃身有多宽。
 *   shards   碎屑量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏；凝刃式以更慢的飞行与更长的冷却换更宽更重的十字。
 *
 * 配置 `keen` 双向取舍（默认关）：
 *   开（凝刃）：威力 ×1.12、十字 +0.35 格、波及比例 +0.06，代价是飞行 ×0.85、冷却 +8 刻。
 *   关（疾刃）：飞行 ×1.15、冷却 −6 刻，代价是威力 ×0.94、十字 −0.2 格。
 */
namespace PokemonSkills {
    export const psychocutId = "psychocut";
    export const psychocutScene = "world_combat:move_psychocut";
    export const psychocutVitalText = "world_combat.move.psychocut.text.vital";
    export const psychocutCutText = "world_combat.move.psychocut.text.cut";
    export const psychocutMissText = "world_combat.move.psychocut.text.miss";
    /** 表现里十字判定的参考半长（格）；服务端传 scale = 实际半长 / 这个值。 */
    export const psychocutReference = 0.9;

    actionParameters.define(psychocutId, {
        /** 刃威力：基础 70，物攻每比 55 多 1 加 0.22（夹 −12..30），特攻每比 55 多 1 加 0.08（夹 −5..12）；
         *  凝刃 ×1.12 / 疾刃 ×0.94；夹在 50..132。 */
        blade: formula(
            F.base(70).plus(F.stat("attack").minus(55).times(0.22).clamp(-12, 30))
                .plus(F.stat("specialAttack").minus(55).times(0.08).clamp(-5, 12))
                .times(F.when(F.pref("keen"), F.const(1.12), F.const(0.94))).clamp(50, 132).round(1),
            "刃威力", {
                unit: "威力",
                description: "心之刃切开对手那一下的接触面威力；物攻给出刃口，特攻给出心之刃凝得多实。对手防御、相性与暴击在命中时另算。"
            }),
        /** 飞行速度：基础 0.45 格/刻，速度每比 55 快 1 加 0.004（夹 −0.08..0.2）；凝刃 ×0.85 / 疾刃 ×1.15；夹 0.3..0.85。 */
        flight: formula(
            F.base(0.45).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.08, 0.2))
                .times(F.when(F.pref("keen"), F.const(0.85), F.const(1.15))).clamp(0.3, 0.85).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "月牙脱手后每刻飞多远；快的个体对手更难读，凝刃式飞得更慢更稳。"
            }),
        /** 射程：基础 9 格，等级 25 起每级 +0.06（夹 −0.8..3.5）；夹 7..15。 */
        reach: formula(
            F.base(9).plus(F.level().minus(25).times(0.06).clamp(-0.8, 3.5)).clamp(7, 15).round(2),
            "射程", {
                unit: "格",
                description: "心之刃能撑多远不散；等级越高掷得越远，它也是本招的实际射程。"
            }),
        /** 十字半径：基础 0.9 格，身高每比 1.4 高 1 加 0.35（夹 −0.1..0.6）；凝刃 +0.35 / 疾刃 −0.2；夹 0.6..1.7。 */
        arc: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.1, 0.6))
                .plus(F.when(F.pref("keen"), F.const(0.35), F.const(-0.2))).clamp(0.6, 1.7).round(2),
            "十字半径", {
                unit: "格",
                description: "命中处切出的十字有多大，也是刃风波及近旁敌人的范围；高大的个体切得更开。"
            }),
        /** 追踪转向：基础 8 度/刻，速度每比 55 快 1 加 0.08（夹 −2..3）；夹 4..16。 */
        guide: formula(
            F.base(8).plus(F.stat("speed").minus(55).times(0.08).clamp(-2, 3)).clamp(4, 16).round(0),
            "追踪转向", {
                unit: "度/刻",
                description: "心之刃每刻最多朝目标校正几度；速度快的个体拐得更急，更难被走位甩掉。"
            }),
        /** 波及比例：基础 0.4，等级 25 起每级 +0.004（夹 −0.05..0.25）；凝刃 +0.06；夹 0.25..0.7。 */
        echo: percent(
            F.base(0.4).plus(F.level().minus(25).times(0.004).clamp(-0.05, 0.25))
                .plus(F.when(F.pref("keen"), F.const(0.06), F.const(0))).clamp(0.25, 0.7),
            "波及比例", "十字刃风扫到近旁其他敌人时，它们保留几成威力；等级越高扫得越实，凝刃式再高一档。"),
        /** 刃判定半径：基础 0.35 格，碰撞箱每比 0.9 宽 1 加 0.2（夹 −0.05..0.25）；夹 0.28..0.62。 */
        radius: formula(
            F.base(0.35).plus(F.body("width").minus(0.9).times(0.2).clamp(-0.05, 0.25)).clamp(0.28, 0.62).round(2),
            "刃判定半径", {
                unit: "格",
                description: "月牙飞行时扫过的横向判定半径；身板越宽的个体掷出的刃越大。"
            }),
        /** 碎屑量：基础 18，物攻每比 55 多 1 加 0.3（夹 −4..28）；夹 12..46。 */
        shards: formula(
            F.base(18).plus(F.stat("attack").minus(55).times(0.3).clamp(-4, 28)).clamp(12, 46).round(0),
            "碎屑量", {
                unit: "个",
                description: "命中处崩出的刃屑数量，由物攻换算；它驱动表现，不是独立伤害。"
            }),
        /** 起手：基础 8 刻，速度每比 55 快 1 减 0.03（夹 −2..3）；凝刃 +3；夹 4..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("keen"), F.const(3), F.const(0))).clamp(4, 14).round(0),
            "起手", "在身前把心之刃凝实的时间；速度越快越短，凝刃式凝得更久。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 减 0.02（夹 −2..2）；凝刃 +2；夹 3..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 2))
                .plus(F.when(F.pref("keen"), F.const(2), F.const(0))).clamp(3, 12).round(0),
            "收招", "掷完刃、把手收回来的时间；快的个体更利落。"),
        /** 冷却：基础 28 刻，速度每比 55 快 1 减 0.04（夹 −4..6）；凝刃 +8 / 疾刃 −6；夹 16..44。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("keen"), F.const(8), F.const(-6))).clamp(16, 44).round(0),
            "冷却", "再次凝刃前等待多久；凝刃式更长，疾刃式更短。"),
        maxTargets: hidden(4)
    });

    defineDamage(psychocutId, "blade", {}, { slice: true });

    stages(psychocutId, [
        { level: 26, values: { blade: 82, arc: 1.1 } },
        { level: 44, values: { blade: 90, reach: 11.5, echo: 0.48 } }
    ]);

    describe(psychocutId, [
        { key: "description.0", values: ["blade"] },
        { key: "description.1", values: ["flight", "reach", "guide"] },
        { key: "description.2", values: ["arc", "echo"] },
        { key: "keen.on", values: [], when: function (context) { return read(context.detail.values, ["keen"]) === true; } },
        { key: "keen.off", values: [], when: function (context) { return read(context.detail.values, ["keen"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blade", "tier.0.arc"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blade", "tier.1.reach", "tier.1.echo"] }
    ]);
}
