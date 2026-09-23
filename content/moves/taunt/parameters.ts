/**
 * 挑衅 / taunt 的参数与数值来源。
 *
 * 原生事实：Dark、Status、威力 —、命中 100、PP 20、目标单体／volatile taunt，持续 3 回合，
 *   期间目标无法使用变化（Status）招式。原生只在回合表上判一次；世界化后它是一句当面的挑衅。
 *
 * 核心念头：一句挑衅把对手点着，让它在怒火里只想出招伤人——怒火上身期间，它所有非伤害招式都被顶回去。
 * 世界化：命中挂共享身份 world_combat:status/taunt 的真实 MobEffect（物品栏可见、/effect 可用），
 *   由本单元的动作策略在提交点拒绝它的变化招式；同时旁挂一枚机读标记带走画面要用的怒火数量与时限。
 *   它不是隔空的「必定封锁」：一句喊话要有一条通视直线，墙后与射程外都会落空。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   tauntTicks   基础 200 刻 + 等级 ×1.5 + 特攻 ×0.4，夹 140..400；等级与这股火气让怒火烧得更久。
 *   provokeReach 基础 10 格 + 特攻 ×0.03 + 身高 ×1.5，夹 7..22；嗓门与身板决定喊得到多远。
 *   rage         基础 16 点 + 特攻 ×0.1 + 等级 ×0.3，夹 10..54；怒火粒子数量也由此派生。
 *   tempo        基础 10 刻 − 速度 ×0.03，夹 6..14；出手越快，这句话越早出口。
 *   aftercast    基础 7 刻 − 速度 ×0.01，夹 4..10；喊完之后的收势。
 *   recharge     基础 130 刻 − 速度 ×0.1，夹 70..170；两次挑衅之间的等待。
 * 配置 manner 双向取舍：讥讽更长更远更耐，但更慢更贵；怒斥更快更便宜、喊得更远，但怒火烧得更短。
 */
namespace PokemonSkills {
    export const tauntId = "taunt";
    export const tauntEffect = "world_combat:taunt_rage";
    export const tauntMark = "world_combat:taunt_mark";
    export const tauntScene = "world_combat:move_taunt";
    export const tauntStatus = "taunt";
    export const tauntRageText = "world_combat.move.taunt.text.rage";
    export const tauntFadeText = "world_combat.move.taunt.text.fade";
    export const tauntMissText = "world_combat.move.taunt.text.miss";

    actionParameters.define(tauntId, {
        tauntTicks: seconds(
            F.base(200).plus(F.level().times(1.5)).plus(F.stat("specialAttack").times(0.4)).clamp(140, 400).round(0),
            "怒火时长", "被挑衅者只能出伤害招式的时长；等级与施法者的特攻让怒火烧得更久。"),
        provokeReach: formula(
            F.base(10).plus(F.stat("specialAttack").times(0.03)).plus(F.body("height").times(1.5)).clamp(7, 22),
            "挑衅距离", { unit: " 格", description: "这句挑衅能喊到多远；特攻越高、身板越大喊得越远，声浪被掩体挡住就落空。" }),
        rage: formula(
            F.base(16).plus(F.stat("specialAttack").times(0.1)).plus(F.level().times(0.3)).clamp(10, 54).round(0),
            "怒焰数量", { unit: " 点", description: "目标身上怒火粒子的数量；特攻与等级越高怒火越旺，也驱动持续画面。" }),
        tempo: seconds(F.base(10).minus(F.stat("speed").times(0.03)).clamp(6, 14).round(0), "起手",
            "把这句话说出口需要多久；速度越快越短。"),
        aftercast: seconds(F.base(7).minus(F.stat("speed").times(0.01)).clamp(4, 10).round(0), "收招",
            "挑衅之后的收势。"),
        recharge: seconds(F.base(130).minus(F.stat("speed").times(0.1)).clamp(70, 170).round(0), "冷却",
            "两次挑衅之间的等待；出手越快越熟练。")
    });
    describe(tauntId, [
        { key: "description.0", values: ["tauntTicks"] },
        { key: "description.1", values: ["provokeReach", "range"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "manner.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.manner === "scorn"); } },
        { key: "manner.1", values: [], when: function (context) { return !(context.detail && context.detail.values) || context.detail.values.manner !== "scorn"; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
