/**
 * 龙尾 / dragontail —— 第 078 组「强制退场」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：龙、物理、威力 60、命中 90、PP 10、优先度 -6、接触；说明是
 *   「弹飞对手，强制拉后备宝可梦上场；如果对手为野生宝可梦，战斗将直接结束」。
 * - 即时战斗翻译：抡起尾巴在身前扫出一大片扇形，把范围内的敌人一起抽飞并逐出交战圈。它是本组唯一
 *   带伤害又带范围的逐退：正面扇形横扫，越靠近越疼，越远弹得越开。被扫中者打上共享身份
 *   `world_combat:status/routed`（本单元效果 world_combat:dragontail_routed），失去目标、被弹开、被逐出；
 *   有合法后备的对手会被原生队伍操作真正换下，野生或没有后备时只逐退。
 * - 参数分散到精灵数据：横扫威力取物攻（尾劲）与体重（甩得动多重），够到多远取物攻，扇形张角取身高（尾长），
 *   弹飞距离取物攻，弹起高度取体重，溃退时长取等级，驱逐步长取速度，保持距离取防御，碎屑数量取物攻，
 *   起手／收招／冷却取速度与等级。
 * - 配置 high（高抛）：开启＝弹起高度 ×1.5，代价是弹飞距离 ×0.85；关闭＝弹飞距离 ×1.25、弹起 ×0.8。
 *   抛得高让对手落点更近但更难自己走回来，送得远则落点更开。
 *
 * 伤害段名 lash：这一扫随精灵数据变化的那部分威力。对手防御、相性与暴击在命中时由共享结算另算。
 */
namespace PokemonSkills {
    export const dragontailId = "dragontail";
    export const dragontailRouted = "world_combat:dragontail_routed";
    export const dragontailRout = "world_combat:dragontail_rout";
    export const dragontailScene = "world_combat:move_dragontail";
    export const dragontailHitText = "world_combat.move.dragontail.text.hit";
    export const dragontailMissText = "world_combat.move.dragontail.text.miss";
    export const dragontailSwitchText = "world_combat.move.dragontail.text.switch";

    actionParameters.define(dragontailId, {
        /** 横扫威力：基础 46；物攻每比 60 多 1 加 0.35（夹 -14..+40），体重每比 50 多 1 加 0.05（夹 -3..+14）；夹在 34..104。 */
        lash: formula(
            F.base(46, "横扫威力")
                .plus(F.stat("attack").minus(60).times(0.35).clamp(-14, 40))
                .plus(F.body("weight").minus(50).times(0.05).clamp(-3, 14))
                .clamp(34, 104).round(1),
            "横扫威力", {
                unit: "威力",
                description: "这一扫随精灵数据变化的那部分：物攻给出尾劲，体重决定甩得动多重的力道。对手防御、相性与暴击在命中时另算。"
            }),
        /** 够到多远：基础 2.6 格 +（物攻 − 60）×0.012（夹 -0.4..+1.0）；夹在 2.2..4.2 格。 */
        reach: formula(
            F.base(2.6, "尾扫距离")
                .plus(F.stat("attack").minus(60).times(0.012).clamp(-0.4, 1.0))
                .clamp(2.2, 4.2).round(2),
            "尾扫距离", {
                unit: " 格",
                description: "尾巴能扫到多远；尾劲大的个体够得更远。它也是本招的实际射程与扇形半径。"
            }),
        /** 扇形张角：基础 150 度 +（身高 − 1.4）×15（夹 -20..+45）；夹在 110..230 度。 */
        sweep: formula(
            F.base(150, "扇形张角")
                .plus(F.body("height").minus(1.4).times(15).clamp(-20, 45))
                .clamp(110, 230).round(0),
            "扇形张角", {
                unit: " 度",
                description: "尾巴在身前扫开多大一片；尾长身高的个体扫得更宽。站在扇形之外就扫不到。"
            }),
        /** 弹飞距离：基础 3.4 格 +（物攻 − 60）×0.02（夹 -0.6..+2.0）；high ×0.85、远送 ×1.25；夹在 2..7 格。 */
        hurl: formula(
            F.base(3.4, "弹飞距离")
                .plus(F.stat("attack").minus(60).times(0.02).clamp(-0.6, 2.0))
                .times(F.when(F.pref("high", text("worldcombat.skill.dragontail.preference.high")), F.const(0.85), F.const(1.25)))
                .clamp(2, 7).round(2),
            "弹飞距离", {
                unit: " 格",
                description: "被扫中者沿背离你的方向飞出多远；尾劲越大送得越远，高抛会把距离换成高度。"
            }),
        /** 弹起高度：基础 0.3 格 +（体重 − 50）×0.003（夹 -0.05..+0.3）；high ×1.5、远送 ×0.8；夹在 0.15..0.8 格。 */
        lift: formula(
            F.base(0.3, "弹起高度")
                .plus(F.body("weight").minus(50).times(0.003).clamp(-0.05, 0.3))
                .times(F.when(F.pref("high", text("worldcombat.skill.dragontail.preference.high")), F.const(1.5), F.const(0.8)))
                .clamp(0.15, 0.8).round(2),
            "弹起高度", {
                unit: " 格",
                description: "被抽飞时的上抛高度；身子越重的个体甩得越高，高抛再 ×1.5。"
            }),
        /** 溃退时长：基础 60 刻 + 等级 ×0.8；夹在 45..160 刻。 */
        flee: seconds(
            F.base(60, "溃退时长")
                .plus(F.level().times(0.8))
                .clamp(45, 160).round(0),
            "溃退时长", "被抽飞的敌人多久回不过神；等级越高抽得越懵。"),
        /** 驱逐步长：基础 0.7 格 +（速度 − 60）×0.004（夹 -0.1..+0.4）；夹在 0.5..1.3 格。 */
        panic: formula(
            F.base(0.7, "驱逐步长")
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.4))
                .clamp(0.5, 1.3).round(2),
            "驱逐步长", {
                unit: " 格",
                description: "溃退期间每 10 刻把敌人从你身边再逐开多远；速度越快追逼得越紧。"
            }),
        /** 保持距离：基础 3.2 格 +（防御 − 60）×0.012（夹 -0.4..+0.8）；夹在 3..6 格。 */
        keepOut: formula(
            F.base(3.2, "保持距离")
                .plus(F.stat("defence").minus(60).times(0.012).clamp(-0.4, 0.8))
                .clamp(3, 6).round(2),
            "保持距离", {
                unit: " 格",
                description: "溃退期间敌人只要离你不足这么远，就会被再一次扫开；越镇得住场面逼得越远。"
            }),
        /** 碎屑数量：基础 14 个 +（物攻 − 60）×0.15（夹 -3..+20）；夹在 10..36 个；驱动画面里的碎屑数量。 */
        shards: formula(
            F.base(14, "碎屑数量")
                .plus(F.stat("attack").minus(60).times(0.15).clamp(-3, 20))
                .clamp(10, 36).round(0),
            "碎屑数量", {
                unit: " 个",
                description: "尾扫命中的碎屑与鳞光数量；尾劲越大越多，画面里的碎屑也按它发射。"
            }),
        /** 起手：基础 10 刻 −（速度 − 60）×0.03（夹 -2..+2）；夹在 6..16 刻。 */
        tempo: seconds(
            F.base(10, "起手")
                .minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 2))
                .clamp(6, 16).round(0),
            "起手", "转身抡尾要多久；速度越快起得越短。"),
        /** 收招：基础 8 刻 −（速度 − 60）×0.02（夹 -2..+2）；夹在 5..12 刻。 */
        aftercast: seconds(
            F.base(8, "收招")
                .minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 2))
                .clamp(5, 12).round(0),
            "收招", "扫完把尾巴收回来的时间；快的个体收得干脆。"),
        /** 冷却：基础 100 刻 − 等级 ×0.4；夹在 75..150 刻。 */
        recharge: seconds(
            F.base(100, "冷却")
                .minus(F.level().times(0.4))
                .clamp(75, 150).round(0),
            "冷却", "两次龙尾之间的等待；等级越高越熟练。PP 10 的代价。"),
        /** 副目标的伤害折扣：扇形里除主目标外的人只挨这么多。 */
        share: hidden(0.55)
    });

    stages(dragontailId, [
        { level: 32, values: { lash: 66 } },
        { level: 48, values: { lash: 78, hurl: 4.4 } }
    ]);

    defineDamage(dragontailId, "lash", { defenceCoefficient: 0.005, rationale: "尾扫对防御的穿透接近默认，突出物攻与体重的差别。" }, { contact: true });

    describe(dragontailId, [
        { key: "description.0", values: ["lash","reach","sweep","share"] },
        { key: "description.1", values: ["hurl","lift"] },
        { key: "description.2", values: ["flee","keepOut","panic"] },
        { key: "description.additional", values: [] },
        { key: "high.on", values: [], when: function (context) { return read(context.detail.values, ["high"]) === true; } },
        { key: "high.off", values: [], when: function (context) { return read(context.detail.values, ["high"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lash", "tier.1.hurl"] }
    ]);
}
