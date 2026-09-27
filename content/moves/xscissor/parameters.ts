/**
 * 十字剪 / xscissor 的参数与数值来源。
 *
 * 原生事实：Bug／物理／威力 80／命中 100／PP 15／接触／slicing（Cobblemon 1.8，105 位学习者）。
 * 原生描述：「将镰刀或爪子像剪刀般地交叉，顺势劈开对手」。
 *
 * 翻译：两把镰刀从身体左右张开，在一个短合拢窗里同时相向旋转，刀尖越过中线、真正交错成一剪；夹口扫过的
 * 目标各被剪一次。不再有先后两拍、也没有同目标第二次追加。玩家关心的是「夹口收在哪里」——把目标框进夹口
 * 就完整剪中，横向闪身可能在刃线合拢前滑出。
 *
 * 数值分散（每个参数读不同的个体数据）：
 *   cut       单次剪伤：物攻定刃口，一次合剪对每个目标只结算一次。
 *   reach     合拢伸展：速度与身高定两臂合拢能伸多远，也是实际射程。
 *   span      合口开度：等级定两刃张开多大；合剪更窄、开剪更宽。
 *   closing   合拢时间：速度定从张开到越线用几刻，快的收得更急。
 *   sever     合剪加成：物攻定合剪形态下这一记剪伤加深多少。
 *   arm       握点间距：碰撞箱宽度定两臂从身体两侧伸出多开。
 *   tempo／aftercast／recharge：速度定节奏，开剪以更短冷却换更宽覆盖。
 *
 * 配置 scissor 双向取舍（默认开）：
 *   开（合剪）：开度收到 86 度、每次剪伤带 sever 加成，代价是起手 +1 刻、冷却 +4 刻。
 *   关（开剪）：开度放宽到 128 度、起手与冷却更短，代价是没有 sever 加成。
 */
namespace PokemonSkills {
    export const xscissorId = "xscissor";
    export const xscissorScene = "world_combat:move_xscissor";
    export const xscissorMissText = "world_combat.move.xscissor.text.miss";
    /** 表现里夹口的参考半宽（格）；服务端传 scale = 实际夹口半宽 / 这个值。 */
    export const xscissorReference = 1.6;

    actionParameters.define(xscissorId, {
        /** 单次剪伤：基础 38，物攻每比 60 多 1 加 0.1，夹在 30..78。 */
        cut: formula(
            F.base(38).plus(F.stat("attack").minus(60).times(0.1).clamp(-8, 20)).clamp(30, 78).round(1),
            "每次剪伤", {
                unit: "威力",
                description: "合剪时两片刃咬入对手的接触威力；一个目标在一次合剪里只结算一次，不再有同目标第二下。对手防御、相性与暴击在命中时另算。"
            }),
        /** 合拢伸展：基础 2.7 格，速度每比 55 快 1 加 0.008，身高每比 1.4 高 1 加 0.05，夹 2.4..3.1。 */
        reach: formula(
            F.base(2.7).plus(F.stat("speed").minus(55).times(0.008)).plus(F.body("height").minus(1.4).times(0.05))
                .clamp(2.4, 3.1).round(2),
            "合拢伸展", {
                unit: "格",
                description: "两臂合拢时刀尖能伸到多远；速度与身高决定伸展范围，它也是本招的实际射程。"
            }),
        /** 合口开度：合剪 86／开剪 128，等级每比 20 高 1 加 0.4，夹 70..150。 */
        span: formula(
            F.when(F.pref("scissor"), F.base(86), F.base(128)).plus(F.level().minus(20).times(0.4))
                .clamp(70, 150).round(0),
            "合口开度", {
                unit: "度",
                description: "两片刃张开的总角度；合剪收窄以便集中在中轴，开剪放宽以罩住身体两侧。"
            }),
        /** 合拢时间：基础 18 刻，速度每比 55 快 1 减 0.05，夹 12..24。 */
        closing: seconds(
            F.base(18).minus(F.stat("speed").minus(55).times(0.05)).clamp(12, 24).round(0),
            "合拢时间", "两片刃从张开合到越线所用的时间；速度越快收得越急，越难被横向闪身溜掉。"),
        /** 合剪加成：基础 0.3，物攻每比 60 多 1 加 0.001，夹 0.15..0.5；开剪形态归零。 */
        sever: percent(
            F.base(0.3).plus(F.stat("attack").minus(60).times(0.001)).clamp(0.15, 0.5)
                .times(F.when(F.pref("scissor"), F.const(1), F.const(0))),
            "合剪加成", "合剪形态下，两片刃咬得更深：被剪中的目标受到的这一记伤害增加这个比例；开剪形态没有这项加成。"),
        /** 握点间距：基础 0.5 格，碰撞箱每比 0.9 宽 1 加 0.35，夹 0.4..0.9。 */
        arm: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.35)).clamp(0.4, 0.9).round(2),
            "握点间距", {
                unit: "格",
                description: "两臂从身体两侧伸出的间距；身体越宽张得越开，夹口也越宽。"
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

    defineDamage(xscissorId, "cut", {}, { contact: true, slice: true });

    stages(xscissorId, [
        { level: 25, values: { cut: 48 } },
        { level: 45, values: { reach: 2.95 } }
    ]);

    describe(xscissorId, [
        { key: "description.0", values: ["cut"] },
        { key: "description.1", values: ["span", "closing"] },
        { key: "description.2", values: ["sever"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cut"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach"] }
    ]);
}
