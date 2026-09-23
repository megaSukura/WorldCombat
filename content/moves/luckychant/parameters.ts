/**
 * 幸运咒语 / luckychant 的参数与数值来源。
 *
 * 原生事实：Normal、Status、威力 —、命中 必中、PP 30、目标己方场地／side luckychant，持续 5 回合，
 *   期间对手对己方（施法者一侧）的攻击不会命中要害。
 * 核心念头：仰头向天唱一句咒语，天光应声罩住自己与身边的队友；落在他们身上的攻击再准，也打不出要害。
 * 世界化：施法者挂共享身份 world_combat:status/luckychant 的真实 MobEffect（物品栏可见、/effect 可用），
 *   并以自身为锚每 20 刻把这份祝福补给半径内的友方；带该身份的活体被暴击那一刻，本单元把暴击抚平
 *   （伤害去掉暴击倍率、暴击标记抹掉、当场播放星光拨开的一下）。咒语跟着施法者走。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   chantTicks  基础 260 刻 + 等级 ×2 + 特攻 ×0.4，夹 180..560；祝福能维持多久，特攻高的人唱得更久。
 *   chantRadius 基础 3.5 格 + 身高 ×0.9 + 特攻 ×0.01，夹 3..7；天光罩住多大一圈盟友。
 *   motes       基础 20 点 + 特攻 ×0.1 + 等级 ×0.3，夹 14..56；星光粒子数量，也驱动持续画面。
 *   tempo       基础 13 刻 − 速度 ×0.03，夹 8..17；开口唱咒的起手。
 *   aftercast   基础 8 刻 − 速度 ×0.01，夹 4..11；收招。
 *   recharge    基础 170 刻 − 速度 ×0.1，夹 100..210；两次起唱之间的等待。
 * 配置 wish 双向取舍：早愿唱得快（起手 −3、冷却 ×0.85），代价是半径 ×0.85、时长 ×0.7；
 *   深愿罩得广、唱得久（半径 ×1.2、时长 ×1.3），代价是起手 +3、冷却 ×1.15。
 */
namespace PokemonSkills {
    export const luckychantId = "luckychant";
    export const luckychantEffect = "world_combat:luckychant_ward";
    export const luckychantMark = "world_combat:luckychant_mark";
    export const luckychantScene = "world_combat:move_luckychant";
    export const luckychantStatus = "luckychant";
    export const luckychantChantText = "world_combat.move.luckychant.text.chant";
    export const luckychantGuardText = "world_combat.move.luckychant.text.guard";
    export const luckychantFadeText = "world_combat.move.luckychant.text.fade";

    actionParameters.define(luckychantId, {
        chantTicks: seconds(
            F.base(260).plus(F.level().times(2)).plus(F.stat("specialAttack").times(0.4)).clamp(180, 560).round(0),
            "祝福时长", "祝福能维持多久；等级与特攻让这句咒语唱得更久。"),
        chantRadius: formula(
            F.base(3.5).plus(F.body("height").times(0.9)).plus(F.stat("specialAttack").times(0.01)).clamp(3, 7),
            "天光半径", { unit: " 格", description: "天光罩住多大一圈盟友；身板越大、特攻越高罩得越广。" }),
        motes: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.1)).plus(F.level().times(0.3)).clamp(14, 56).round(0),
            "星光数量", { unit: " 点", description: "星光粒子的数量；特攻与等级越高星越多，也驱动持续画面。" }),
        tempo: seconds(F.base(13).minus(F.stat("speed").times(0.03)).clamp(8, 17).round(0), "起手",
            "开口唱咒需要多久；速度越快越短。"),
        aftercast: seconds(F.base(8).minus(F.stat("speed").times(0.01)).clamp(4, 11).round(0), "收招",
            "唱完之后的收势。"),
        recharge: seconds(F.base(170).minus(F.stat("speed").times(0.1)).clamp(100, 210).round(0), "冷却",
            "两次起唱之间的等待。")
    });
    describe(luckychantId, [
        { key: "description.0", values: ["chantTicks", "chantRadius"] },
        { key: "description.1", values: [] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "wish.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.wish === "early"); } },
        { key: "wish.1", values: [], when: function (context) { return !(context.detail && context.detail.values) || context.detail.values.wish !== "early"; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] }
    ]);
}
