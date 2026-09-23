/**
 * 十字剪 / xscissor 的参数与数值来源。
 *
 * 原生事实：Bug／物理／威力 80／命中 100／PP 15／接触／slicing（Cobblemon 1.8，105 位学习者）。
 * 原生描述：「将镰刀或爪子像剪刀般地交叉，顺势劈开对手」。
 *
 * 翻译：把「两把镰刀像剪刀一样交叉」落成两拍——左刃先合、右刃后合，各自扫过身前一侧的半扇面，
 * 在中轴线上交叉成一个 X。站在中轴上的目标被两刃同时剪中，结算两次；偏到一侧只被一片刃扫到。
 * 这正是「瞄准中轴才能完整剪断」的形状：玩家把目标框在两刃之间，得到的是一记 X，而不是一道斜线。
 *
 * 数值分散（每个参数读不同的个体数据）：
 *   blade     每刃威力：物攻定刃口。
 *   reach     合剪距离：速度与身高定两臂合拢能到多远，也是实际射程。
 *   span      扇面张角：等级定张开的幅度；合剪更窄、开剪更宽。
 *   gap       两刃间隔：速度定左刃到右刃之间隔几刻，快的收得更快。
 *   sever     合剪加成：物攻定第二刃对已被第一刃切中的目标额外加多少。
 *   arm       刃势臂长：碰撞箱宽度定表现里两臂画多长。
 *   tempo／aftercast／recharge：速度定节奏，开剪以更长的冷却换更宽的覆盖。
 *
 * 配置 scissor 双向取舍（默认开）：
 *   开（合剪）：切中轴的目标吃满两刃、第二刃再得 sever 加成，张角收窄；代价是冷却 +4 刻。
 *   关（开剪）：张角放宽 42 度、冷却更短，代价是没有 sever 加成、两刃更分散。
 */
namespace PokemonSkills {
    export const xscissorId = "xscissor";
    export const xscissorScene = "world_combat:move_xscissor";
    export const xscissorCrossText = "world_combat.move.xscissor.text.cross";
    export const xscissorMissText = "world_combat.move.xscissor.text.miss";
    /** 表现里判定臂的参考长度（格）；服务端传 scale = 实际臂长 / 这个值。 */
    export const xscissorReference = 0.5;

    actionParameters.define(xscissorId, {
        /** 每刃威力：基础 38，物攻每比 60 多 1 加 0.1，夹在 30..78。 */
        blade: formula(
            F.base(38).plus(F.stat("attack").minus(60).times(0.1).clamp(-8, 20)).clamp(30, 78).round(1),
            "每刃威力", {
                unit: "威力",
                description: "交叉剪里每一片刃的接触威力；被两刃同时剪中的目标结算两次。对手防御、相性与暴击在命中时另算。"
            }),
        /** 合剪距离：基础 2.7 格，速度每比 55 快 1 加 0.008，身高每比 1.4 高 1 加 0.05，夹 2.4..3.1。 */
        reach: formula(
            F.base(2.7).plus(F.stat("speed").minus(55).times(0.008)).plus(F.body("height").minus(1.4).times(0.05))
                .clamp(2.4, 3.1).round(2),
            "合剪距离", {
                unit: "格",
                description: "两臂合拢能剪到多远；速度与身高决定伸展范围，它也是本招的实际射程。"
            }),
        /** 扇面张角：合剪 86／开剪 128，等级每比 20 高 1 加 0.4，夹 70..150。 */
        span: formula(
            F.when(F.pref("scissor"), F.base(86), F.base(128)).plus(F.level().minus(20).times(0.4))
                .clamp(70, 150).round(0),
            "扇面张角", {
                unit: "度",
                description: "两片刃合起来扫过的总开口；合剪更窄以集中在中轴，开剪更宽以照顾两侧。"
            }),
        /** 两刃间隔：基础 6 刻，速度每比 55 快 1 减 0.04，夹 3..9。 */
        gap: formula(
            F.base(6).minus(F.stat("speed").minus(55).times(0.04)).clamp(3, 9).round(0),
            "两刃间隔", {
                unit: "刻",
                description: "左刃落到右刃之间隔几刻；速度越快两刃收得越紧。"
            }),
        /** 合剪加成：基础 0.3，物攻每比 60 多 1 加 0.001，夹 0.15..0.5；开剪形态归零。 */
        sever: percent(
            F.base(0.3).plus(F.stat("attack").minus(60).times(0.001)).clamp(0.15, 0.5)
                .times(F.when(F.pref("scissor"), F.const(1), F.const(0))),
            "合剪加成", "合剪形态下，第二刃对已被第一刃切中的目标额外增加的伤害比例；开剪形态没有这项加成。"),
        /** 刃势臂长：基础 0.5 格，碰撞箱每比 0.9 宽 1 加 0.35，夹 0.4..0.9。 */
        arm: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.35)).clamp(0.4, 0.9).round(2),
            "刃势臂长", {
                unit: "格",
                description: "表现里从身体两侧伸出的刃势长度；身体越宽两臂张得越开。"
            }),
        /** 起手：基础 7 刻，速度每比 55 快 1 减 0.02，合剪 +1，夹 4..11。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02))
                .plus(F.when(F.pref("scissor"), F.const(1), F.const(0))).clamp(4, 11).round(0),
            "起手", "双臂交叉蓄势的时间；速度越快越短，合剪形态略久。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 减 0.015，夹 4..11。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015)).clamp(4, 11).round(0),
            "收招", "剪完收回双臂的时间；速度越快越短。"),
        /** 冷却：基础 26 刻，速度每比 55 快 1 减 0.04，合剪 +4，夹 16..38。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.04))
                .plus(F.when(F.pref("scissor"), F.const(4), F.const(0))).clamp(16, 38).round(0),
            "冷却", "再次合剪前的等待；合剪形态更长。")
    });

    defineDamage(xscissorId, "blade", {}, { contact: true, slice: true });

    stages(xscissorId, [
        { level: 25, values: { blade: 48 } },
        { level: 45, values: { reach: 2.95 } }
    ]);

    describe(xscissorId, [
        { key: "description.0", values: ["blade"] },
        { key: "description.1", values: ["span","gap"] },
        { key: "description.2", values: ["sever"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blade"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach"] }
    ]);
}
