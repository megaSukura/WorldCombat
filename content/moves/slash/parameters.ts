/**
 * 劈开 / slash 的参数与数值来源。
 *
 * 原生事实：Normal／物理／威力 70／命中 100／PP 20／接触／slicing／critRatio 2（暴击率高一档；
 * Cobblemon 1.8，131 位学习者）。原生描述强调「容易击中要害」。
 *
 * 翻译：把「一次高暴击的劈开」落成一记站定、举刃、朝身前一条窄而高的竖直面压下去的斜劈——比居合斩慢、
 * 比连斩重、比十字剪稳；命中时在落点画出一道由高处斜下的长刀痕，若真劈中要害（原生暴击），再补一次更亮的强调。
 * 暴击本身沿用原生 critRatio 2 的共享结算，不另造骰子；要害闪只来自真实回执，普通命中不画。
 * 选取为 `kind: "aim"`：可点实体或方向/落点，横向窄所以旁侧不挨刀，纵向高所以高目标仍被覆盖。
 *
 * 数值分散（每个参数读不同的个体数据）：
 *   cleave     劈开威力：物攻定刃口，配置 heavy 再各给我一档。
 *   reach      劈距：速度定踏出的直距，也是实际射程。
 *   depth      斩深：身高定这一记压到多深。
 *   edge       刀面半宽：碰撞箱宽度定走廊有多宽；重刃收窄、疾刃放宽。
 *   notes      命中崩屑量：物攻换算，驱动表现。
 *   tempo／aftercast／recharge：速度定节奏，重刃以更长的起手与冷却换更重的一击。
 *
 * 配置 heavy 双向取舍（默认关）：
 *   开（重刃）：威力 ×1.16、斩深 +0.3，代价是刀面收窄 0.08 格、起手 +4 刻、冷却 +8 刻。
 *   关（疾刃）：出手更快、刀面更宽 0.1 格、收招更快，代价是威力 ×0.92。
 */
namespace PokemonSkills {
    export const slashId = "slash";
    export const slashScene = "world_combat:move_slash";
    export const slashWeakText = "world_combat.move.slash.text.weak";
    export const slashMissText = "world_combat.move.slash.text.miss";
    /** 表现里走廊判定的参考半宽（格）；服务端传 scale = 实际半宽 / 这个值。 */
    export const slashReference = 0.5;

    actionParameters.define(slashId, {
        /** 劈开威力：基础 70，重刃 ×1.16／疾刃 ×0.92，物攻每比 60 多 1 加 0.16，夹在 52..132。 */
        cleave: formula(
            F.base(70).times(F.when(F.pref("heavy"), F.const(1.16), F.const(0.92)))
                .plus(F.stat("attack").minus(60).times(0.16).clamp(-14, 30)).clamp(52, 132).round(1),
            "劈开威力", {
                unit: "威力",
                description: "这一记斜劈的接触威力；物攻越高刃口越沉。对手防御、相性与暴击在命中时另算。"
            }),
        /** 劈距：基础 2.6 格，速度每比 55 快 1 加 0.007，夹 2.3..2.9。 */
        reach: formula(
            F.base(2.6).plus(F.stat("speed").minus(55).times(0.007)).clamp(2.3, 2.9).round(2),
            "劈距", {
                unit: "格",
                description: "举刃压出多远；速度快的个体踏得更前，它也是本招的实际射程。"
            }),
        /** 斩深：基础 1.4 格，身高每比 1.4 高 1 加 0.4，重刃 +0.3，夹 1.2..2.2。 */
        depth: formula(
            F.base(1.4).plus(F.body("height").minus(1.4).times(0.4))
                .plus(F.when(F.pref("heavy"), F.const(0.3), F.const(0))).clamp(1.2, 2.2).round(2),
            "斩深", {
                unit: "格",
                description: "这一记从脚上压到多高的竖直覆盖；高大的个体劈得更深，重刃形态再往下压。"
            }),
        /** 刀面半宽：基础 0.5 格，碰撞箱每比 0.9 宽 1 加 0.3，重刃 −0.08／疾刃 +0.1，夹 0.4..0.9。 */
        edge: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.3))
                .plus(F.when(F.pref("heavy"), F.const(-0.08), F.const(0.1))).clamp(0.4, 0.9).round(2),
            "刀面半宽", {
                unit: "格",
                description: "走廊判定的横向半宽；身体越宽刀面越宽，疾刃形态更宽、重刃更窄。"
            }),
        /** 崩屑量：基础 18，物攻每比 55 多 1 加 0.3，夹 14..46。 */
        notes: formula(
            F.base(18).plus(F.stat("attack").minus(55).times(0.3)).clamp(14, 46).round(0),
            "崩屑量", {
                unit: "个",
                description: "命中处崩出的细屑数量，由物攻换算；它驱动命中火花的表现，不是独立伤害。"
            }),
        /** 起手：基础 9 刻，速度每比 55 快 1 减 0.03，重刃 +4／疾刃 −2，夹 5..16。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03))
                .plus(F.when(F.pref("heavy"), F.const(4), F.const(-2))).clamp(5, 16).round(0),
            "起手", "举刃蓄势的时间；速度越快越短，重刃形态要更久。"),
        /** 收招：基础 9 刻，速度项，重刃 +2／疾刃 −2，夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02))
                .plus(F.when(F.pref("heavy"), F.const(2), F.const(-2))).clamp(5, 14).round(0),
            "收招", "劈开后收势的时间；疾刃形态更短。"),
        /** 冷却：基础 34 刻，速度每比 55 快 1 减 0.05，重刃 +8／疾刃 −4，夹 20..48。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.05))
                .plus(F.when(F.pref("heavy"), F.const(8), F.const(-4))).clamp(20, 48).round(0),
            "冷却", "再次举刃前的等待；重刃形态更长，疾刃更短。")
    });

    defineDamage(slashId, "cleave", {}, { contact: true, slice: true });

    stages(slashId, [
        { level: 25, values: { cleave: 82 } },
        { level: 46, values: { depth: 1.8 } }
    ]);

    describe(slashId, [
        { key: "description.0", values: ["cleave"] },
        { key: "description.1", values: ["reach", "edge", "depth"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cleave"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.depth"] }
    ]);
}
