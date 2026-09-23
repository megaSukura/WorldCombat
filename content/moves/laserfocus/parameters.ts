/**
 * 磨砺 / Laser Focus 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中必中、PP 30、优先度 0、目标 self、
 *   volatileStatus laserfocus（持续 2 回合，onModifyCritRatio 返回 5，即下一次攻击必定击中要害）。
 *
 * 世界化：不是「下一回合暴击」，而是**把精神收束成一道细光压在自己的下一次出手上**。提交后身上留住一层
 *   可见的锐意窗口（身份 world_combat:status/laserfocus），期间自己的**下一次伤害结算**被抬成必定要害；
 *   那一击落下时锐意散开用掉，不出手则随时间自行褪去。要害的倍率与目标的防暴击特性都交给共享结算。
 *   反制：对手可以在锐意还没兑现前拉开、格挡（守卫按共享规则抵扣后仍算命中，但打不出足够的血）、或用
 *   幸运咒语一类效果把这次要害抚平。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实）：
 *   focusTicks  锐意窗口：基础 170 刻 + 亲密度 × 0.6，沉心蓄势 ×1.6／即砺 ×0.7，夹 110..520；
 *               越亲近留得越久。等级阶梯（stages）把窗口按等级抬到 190/260/340（即砺设计值）。
 *   motes       锐光量：基础 16 + 物攻 × 0.09，沉心蓄势 ×1.25，夹 12..56；物攻越高越密，也驱动画面的光点。
 *   edge        锐光长度：基础 1.2 + 碰撞箱高度 × 0.5，夹 1.2..2.8；身板越高，收束光柱越长。
 *   spark       要害迸发：基础 18 + 物攻 ÷ 5，沉心蓄势 ×1.2，夹 16..72；要害那一下的光点数，按物攻派生。
 *   tempo       起手：基础 6 − (速度 − 60) × 0.02（只取正值），沉心蓄势 +3，夹 4..12；速度越快越短。
 *   aftercast   收招：基础 4 + 碰撞箱高度 × 1.2，夹 4..9。
 *   recharge    冷却：基础 74 − (特攻 − 50) × 0.12（只取正值），沉心蓄势 +16／即砺 −8，夹 40..110。PP 30。
 * 配置 steady（沉心蓄势）双向取舍：开启＝窗口 ×1.6、光点更盛，但起手 +3、冷却 +16（一次更稳更重的必杀）；
 *   关闭＝窗口 ×0.7、起手 −0、冷却 −8（更频繁的速砺）。两个方向各有适用局面。
 */
namespace PokemonSkills {
    export const laserfocusId = "laserfocus";
    export const laserfocusScene = "world_combat:move_laserfocus";
    export const laserfocusEffect = "world_combat:laserfocus_edge";
    export const laserfocusMark = "world_combat:laserfocus_mark";
    export const laserfocusStatus = "laserfocus";
    export const laserfocusReadyText = "world_combat.move.laserfocus.text.ready";
    export const laserfocusCritText = "world_combat.move.laserfocus.text.crit";
    export const laserfocusFadeText = "world_combat.move.laserfocus.text.fade";

    actionParameters.define(laserfocusId, {
        focusTicks: seconds(
            F.base(170).plus(F.individual("friendship").times(0.6))
                .times(F.when(F.pref("steady", text("worldcombat.skill.laserfocus.preference.steady")), F.const(1.6), F.const(0.7)))
                .clamp(110, 520).round(0),
            "锐意窗口", "这层锐意留在身上多久；越亲近留得越久，沉心蓄势明显更长；出手兑现或走完即散。"),
        motes: formula(
            F.base(16).plus(F.stat("attack").times(0.09))
                .times(F.when(F.pref("steady", text("worldcombat.skill.laserfocus.preference.steady")), F.const(1.25), F.const(1)))
                .clamp(12, 56).round(0),
            "锐光量", {
                unit: " 点",
                description: "起手与身上锐光的粒子数量；物攻越高越密，沉心蓄势更盛，画面里的光点与它一致。"
            }),
        edge: formula(
            F.base(1.2).plus(F.body("height").times(0.5)).clamp(1.2, 2.8).round(2),
            "锐光长度", {
                unit: " 格",
                description: "收束光柱的长度，也是要害迸发铺开的尺度；身板越高越长。"
            }),
        spark: formula(
            F.base(18).plus(F.stat("attack").div(5))
                .times(F.when(F.pref("steady", text("worldcombat.skill.laserfocus.preference.steady")), F.const(1.2), F.const(1)))
                .clamp(16, 72).round(0),
            "要害迸发", {
                unit: " 点",
                description: "命中要害那一下迸出的光点数量；物攻越高越密，沉心蓄势更亮。"
            }),
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).max(0).times(0.02))
                .plus(F.when(F.pref("steady", text("worldcombat.skill.laserfocus.preference.steady")), F.const(3), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "把精神收成一束需要多久；速度越快越短，沉心蓄势多花几刻。"),
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(1.2)).clamp(4, 9).round(0),
            "收招", "锐意落定后的收势；身板越高大收得越慢。"),
        recharge: seconds(
            F.base(74).minus(F.stat("specialAttack").minus(50).max(0).times(0.12))
                .plus(F.when(F.pref("steady", text("worldcombat.skill.laserfocus.preference.steady")), F.const(16), F.const(-8)))
                .clamp(40, 110).round(0),
            "冷却", "两次磨砺之间的等待；心神越盛越熟练，沉心蓄势更费力。PP 30。")
    });

    // 阶梯把窗口按等级抬高；进入阶梯的参数不再写 F.level()，等级只由阶梯提供（避免双重计入）。
    // 阶梯写的是「即砺（steady=false）」下的最终设计值。
    stages(laserfocusId, [
        { level: 20, values: { focusTicks: 190 } },
        { level: 45, values: { focusTicks: 260 } },
        { level: 70, values: { focusTicks: 340 } }
    ]);

    describe(laserfocusId, [
        { key: "description.0", values: ["focusTicks"] },
        { key: "steady.on", values: ["tempo", "recharge"], when: function (context) { return read(context.detail.values, ["steady"]) === true; } },
        { key: "steady.off", values: [], when: function (context) { return read(context.detail.values, ["steady"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.focusTicks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.focusTicks"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.focusTicks"] }
    ]);
}
