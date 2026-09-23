/**
 * 水波刀 / aquacutter 的参数与数值来源。
 *
 * 原生事实：Water／物理／威力 70／命中 100／PP 20／非接触、切斩（slicing）／critRatio 2（暴击率高出一档；
 * Cobblemon 1.8，共 9 位直接学习者，是四记里最稀有的）。原生描述：「如刀刃般喷射出加压的水切开对手，
 * 容易击中要害」。
 *
 * 翻译：把「加压的水像刀刃」落成一道**笔直、极快、细窄的水线**——从口边喷出，像刀一样切开沿途的目标，
 * 笔直穿过成排的对手而不是停在一个身上；切中的目标被溅湿（共享身份 `world_combat:status/soaked`，
 * 与水流尾、波动冲、水流裂破、贝壳刃的湿身是同一件事），为别的招留一段水湿窗口。
 * 「容易击中要害」沿用原生 critRatio 2 的共享结算，本单元只负责把这记要害画出来。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   jet       水线威力：物攻定水压，速度定喷出的冲劲。
 *   pressure  喷射速度：速度定水线飞得多快（它是本族最快的一击）。
 *   reach     射程：等级定水柱能撑多远不散。
 *   bore      贯穿目标数：等级 35 起才可能一次切穿第二个。
 *   radius    水线判定半径：碰撞箱宽度定水线有多粗。
 *   soakTicks 湿身时长：等级定被溅湿多久。
 *   spray     水花量：速度换算，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏；贯流式以更慢的喷射与更长的冷却换更窄更重、能贯穿更多。
 *
 * 配置 `lance` 双向取舍（默认关）：
 *   开（贯流式）：威力 ×1.12、贯穿目标 +1、判定收窄 0.05 格，代价是喷射 ×0.88、冷却 +7 刻。
 *   关（散射式）：喷射 ×1.12、判定放宽 0.08 格、冷却 −5 刻，代价是威力 ×0.94。
 */
namespace PokemonSkills {
    export const aquacutterId = "aquacutter";
    export const aquacutterScene = "world_combat:move_aquacutter";
    export const aquacutterSoaked = "world_combat:aquacutter_soaked";
    export const aquacutterVitalText = "world_combat.move.aquacutter.text.vital";
    export const aquacutterCutText = "world_combat.move.aquacutter.text.cut";
    export const aquacutterMissText = "world_combat.move.aquacutter.text.miss";
    /** 表现里水线判定的参考半径（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const aquacutterReference = 0.28;

    actionParameters.define(aquacutterId, {
        /** 水线威力：基础 70，物攻每比 55 多 1 加 0.22（夹 −12..30），速度每比 55 快 1 加 0.1（夹 −5..14）；
         *  贯流 ×1.12 / 散射 ×0.94；夹在 48..132。 */
        jet: formula(
            F.base(70).plus(F.stat("attack").minus(55).times(0.22).clamp(-12, 30))
                .plus(F.stat("speed").minus(55).times(0.1).clamp(-5, 14))
                .times(F.when(F.pref("lance"), F.const(1.12), F.const(0.94))).clamp(48, 132).round(1),
            "水线威力", {
                unit: "威力",
                description: "水刀切开目标那一下的切斩威力；物攻给出水压，速度给出喷出的冲劲。对手防御、相性与暴击在命中时另算。"
            }),
        /** 喷射速度：基础 0.92 格/刻，速度每比 55 快 1 加 0.006（夹 −0.12..0.25）；贯流 ×0.88 / 散射 ×1.12；夹 0.68..1.4。 */
        pressure: formula(
            F.base(0.92).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.12, 0.25))
                .times(F.when(F.pref("lance"), F.const(0.88), F.const(1.12))).clamp(0.68, 1.4).round(2),
            "喷射速度", {
                unit: "格/刻",
                description: "水线每刻飞多远；这是本族最快的一击，贯流式压得更集中、飞得稍慢。"
            }),
        /** 射程：基础 10 格，等级 25 起每级 +0.07（夹 −0.8..3.5）；夹 8..16。 */
        reach: formula(
            F.base(10).plus(F.level().minus(25).times(0.07).clamp(-0.8, 3.5)).clamp(8, 16).round(2),
            "射程", {
                unit: "格",
                description: "水柱能撑多远不散；等级越高喷得越远，它也是本招的实际射程。"
            }),
        /** 贯穿目标数：基础 1，等级 35 起每级 +0.04（夹 0..3），贯流 +1；夹 1..4。 */
        bore: formula(
            F.base(1).plus(F.level().minus(35).times(0.04).clamp(0, 3))
                .plus(F.when(F.pref("lance"), F.const(1), F.const(0))).floor().clamp(1, 4),
            "贯穿目标数", {
                unit: "个",
                description: "一道水线最多切穿几个对手；等级高的个体切得更透，贯流式再多穿一个。"
            }),
        /** 水线判定半径：基础 0.28 格，碰撞箱每比 0.9 宽 1 加 0.18（夹 −0.04..0.2）；贯流 −0.05 / 散射 +0.08；夹 0.2..0.52。 */
        radius: formula(
            F.base(0.28).plus(F.body("width").minus(0.9).times(0.18).clamp(-0.04, 0.2))
                .plus(F.when(F.pref("lance"), F.const(-0.05), F.const(0.08))).clamp(0.2, 0.52).round(2),
            "水线判定半径", {
                unit: "格",
                description: "水线扫过的横向判定半径；身体越宽的个体喷出的水线越粗，贯流式收得更细。"
            }),
        /** 湿身时长：基础 60 刻，等级 25 起每级 +1.2（夹 −12..60）；夹 40..180。 */
        soakTicks: seconds(
            F.base(60).plus(F.level().minus(25).times(1.2).clamp(-12, 60)).clamp(40, 180).round(0),
            "湿身时长", "被水线切中的目标湿身多久；湿身是共享身份 world_combat:status/soaked，别的单元（水流炮、冰冻干燥等）可以读它。等级越高溅得越久。"),
        /** 水花量：基础 20，速度每比 55 快 1 加 0.4（夹 −6..30）；夹 14..50。 */
        spray: formula(
            F.base(20).plus(F.stat("speed").minus(55).times(0.4).clamp(-6, 30)).clamp(14, 50).round(0),
            "水花量", {
                unit: "个",
                description: "水线切开目标时溅出的水花数量，由速度换算；它驱动表现，不是独立伤害。"
            }),
        /** 起手：基础 7 刻，速度每比 55 快 1 减 0.03（夹 −2..3）；贯流 +2；夹 3..13。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("lance"), F.const(2), F.const(0))).clamp(3, 13).round(0),
            "起手", "把水压在口边、蓄到能喷出去的时间；速度越快越短，贯流式压得更久。"),
        /** 收招：基础 6 刻，速度每比 55 快 1 减 0.02（夹 −2..2）；贯流 +1；夹 3..11。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 2))
                .plus(F.when(F.pref("lance"), F.const(1), F.const(0))).clamp(3, 11).round(0),
            "收招", "喷完收住水压的时间；快的个体更干脆。"),
        /** 贯穿与湿身保留；两次水线之间留出走位和换招的间隔。 */
        recharge: seconds(
            F.base(42).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("lance"), F.const(7), F.const(-5))).clamp(30, 56).round(0),
            "冷却", "再次喷出水线前等待多久；贯流式更长，散射式更短。"),
        maxTargets: hidden(4)
    });

    defineDamage(aquacutterId, "jet", {}, { slice: true });

    stages(aquacutterId, [
        { level: 27, values: { jet: 82, bore: 2 } },
        { level: 45, values: { jet: 90, reach: 12.4, soakTicks: 84 } }
    ]);

    describe(aquacutterId, [
        { key: "description.0", values: ["jet"] },
        { key: "description.1", values: ["pressure", "reach", "radius"] },
        { key: "description.2", values: ["bore", "soakTicks"] },
        { key: "lance.on", values: [], when: function (context) { return read(context.detail.values, ["lance"]) === true; } },
        { key: "lance.off", values: [], when: function (context) { return read(context.detail.values, ["lance"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jet", "tier.0.bore"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jet", "tier.1.reach", "tier.1.soakTicks"] }
    ]);
}
