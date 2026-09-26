/**
 * 居合斩 / cut 的参数与数值来源。
 *
 * 原生事实：Normal／物理／威力 50／命中 95／PP 30／接触／slicing（Cobblemon 1.8，243 位学习者）。
 * 原生描述只说「用镰刀或爪子等切斩对手」；它同时是地图上割草的居合斩，这一层被翻译进来：
 * 这是一记贴地的宽横斩，扫过时顺手把弧内、刀路没有被硬墙挡住的低矮植被一起割掉。
 *
 * 翻译：把「50 威力的一次切斩」落成一趟贴地的宽弧——不追单点，而是用张角与扫距决定它罩住多大一片。
 * 放弃了「单目标点名」：弧内的每个非友方各挨一记，站进弧里就要付账。
 *
 * 数值分散（每个参数读不同的个体数据）：
 *   slash      斩击威力：物攻定刀锋，快慢只改节奏不提升它。
 *   sweep      扫距：速度定这趟横扫能推多远，也是本招的实际射程。
 *   arc        张角：速度定身体拧转的幅度（配置 wide 再各给我一档）。
 *   breadth    斩带高度：身高定贴地横斩覆盖的垂直带。
 *   clearance  清场株数：等级定顺手割草的预算（配置 wide 多给几株）。
 *   notes      命中崩出的细屑量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏，wide 以更长的收招换更大的面。
 *
 * 配置 wide 双向取舍（默认开）：
 *   开（横斩）：张角更宽、清场更多、斩带略高，代价是单发威力 ×0.86、冷却更长。
 *   关（狠劈）：威力 ×1.18、收招更快，代价是覆盖面收窄、清场变少。
 */
namespace PokemonSkills {
    export const cutId = "cut";
    export const cutScene = "world_combat:move_cut";
    export const cutMissText = "world_combat.move.cut.text.miss";
    export const cutShearText = "world_combat.move.cut.text.shear";
    /** 表现与判定共用的弧面参考扫距（格）；服务端传 scale = 实际扫距 / 这个值。 */
    export const cutReference = 2.6;

    actionParameters.define(cutId, {
        /** 斩击威力：基础 46，wide ×0.86／狠劈 ×1.18，物攻每比 55 多 1 加 0.13，夹在 32..96。 */
        slash: formula(
            F.base(46).times(F.when(F.pref("wide"), F.const(0.86), F.const(1.18)))
                .plus(F.stat("attack").minus(55).times(0.13).clamp(-12, 26)).clamp(32, 96).round(1),
            "斩击威力", {
                unit: "威力",
                description: "贴地横斩每命中一个目标的接触威力；物攻越高刃口越深。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扫距：基础 2.55 格，速度每比 55 快 1 加 0.008，身高每比 1.4 高 1 加 0.06，夹 2.3..3.0。 */
        sweep: formula(
            F.base(2.55).plus(F.stat("speed").minus(55).times(0.008)).plus(F.body("height").minus(1.4).times(0.06))
                .clamp(2.3, 3.0).round(2),
            "扫距", {
                unit: "格",
                description: "一趟横扫从身前推出去多远；速度与身高决定刃风铺开的半径，它也是本招的实际射程。"
            }),
        /** 张角：wide 168／狠劈 118，速度每比 55 快 1 加 0.35，夹 96..200。 */
        arc: formula(
            F.when(F.pref("wide"), F.base(168), F.base(118))
                .plus(F.stat("speed").minus(55).times(0.35)).clamp(96, 200).round(0),
            "张角", {
                unit: "度",
                description: "贴地横扫覆盖的扇形开口；速度越快身体拧得越开，横斩形态下再额外放宽。"
            }),
        /** 斩带高度：基础 1.35 格，身高每比 1.4 高 1 加 0.5，狠劈再 +0.25，夹 1.1..2.1。 */
        breadth: formula(
            F.base(1.35).plus(F.body("height").minus(1.4).times(0.5))
                .plus(F.when(F.pref("wide"), F.const(0), F.const(0.25))).clamp(1.1, 2.1).round(2),
            "斩带高度", {
                unit: "格",
                description: "弧面在竖直方向罩住多高；高大的个体把斩带抬得更高，狠劈形态收得更集中。"
            }),
        /** 清场株数：基础 5，等级每比 20 高 1 加 0.1，横斩再 +5，夹 3..14。 */
        clearance: formula(
            F.base(5).plus(F.level().minus(20).times(0.1)).plus(F.when(F.pref("wide"), F.const(5), F.const(0)))
                .clamp(3, 14).round(0),
            "清场株数", {
                unit: "株",
                description: "这一趟最多割掉弧内几株低矮植被（草、蕨、花、作物、树叶）；等级越高、横扫形态下割得越多。"
            }),
        /** 细屑量：基础 14，物攻每比 55 多 1 加 0.2，夹 10..40。 */
        notes: formula(
            F.base(14).plus(F.stat("attack").minus(55).times(0.2)).clamp(10, 40).round(0),
            "崩屑量", {
                unit: "个",
                description: "命中处崩出的细屑数量，由物攻换算；它驱动命中火花的表现，不是独立伤害。"
            }),
        /** 起手：基础 4 刻，速度每比 55 快 1 减 0.012，夹 2..6。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.012)).clamp(2, 6).round(0),
            "起手", "抬镰到挥出的时间；速度越快越短。"),
        /** 收招：基础 5 刻，速度项，夹 3..7。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.01)).clamp(3, 7).round(0),
            "收招", "横扫收势的时间；速度越快越短。"),
        /** 冷却：基础 18 刻，速度每比 55 快 1 减 0.03，横斩 +4／狠劈 −4，夹 10..28。 */
        recharge: seconds(
            F.base(18).minus(F.stat("speed").minus(55).times(0.03))
                .plus(F.when(F.pref("wide"), F.const(4), F.const(-4))).clamp(10, 28).round(0),
            "冷却", "再次挥出前的等待；横扫形态冷却更长，狠劈形态更短。")
    });

    defineDamage(cutId, "slash", {}, { contact: true, slice: true });

    stages(cutId, [
        { level: 22, values: { sweep: 2.82 } },
        { level: 40, values: { slash: 50 } }
    ]);

    describe(cutId, [
        { key: "description.0", values: ["slash"] },
        { key: "description.1", values: ["sweep", "arc", "breadth"] },
        { key: "description.2", values: ["clearance"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sweep"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slash"] }
    ]);
}
