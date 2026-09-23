/**
 * 无理取闹 / torment —— 参数与机制数值来源。
 *
 * 核心念头：一句当面的取笑把对手的节奏钉死，让它不能连着两次使出同一招。它不是伤害，是给对手的
 *   上一手下一道“禁令”：只要烦躁还在，那一手就被顶回去。
 *
 * 原生事实（Showdown torment）：Dark／变化／命中 100／PP 15／单体；给目标挂 volatile torment，
 *   `onDisableMove` 把 `pokemon.lastMove` 禁掉——目标不能连续使用同一招，直到被替换下场。世界化后
 *   烦躁是一段有限时长，落在共享身份 world_combat:status/torment 的真实 MobEffect 上；拒绝的逻辑读
 *   目标最近一次真正提交的招式（NativeEffects.State.used），在提交点顶回同一手。宝可梦、原版生物、
 *   玩家走同一条路：只要带着这枚身份。
 *
 * 每个参数读不同的精灵数据（分散到不同参数）：
 *   reach        取笑得够多远：特攻决定嗓门，体型决定身板；也是本招的实际射程来源。
 *   tormentTicks 烦躁持续多久：等级延长，特攻助燃。
 *   irritation   烦躁值（画面里讥讽符环与碎点的数量）：特攻越高越密。
 *   tempo        起手：速度越快越早出口。
 *   aftercast    收势：速度越快越快收住。
 *   recharge     冷却：速度越快越熟练。
 * 配置 manner（取笑方式）双向取舍：讥讽更久、更远，但更慢、更贵；怒斥更快更省，但烦躁烧得短、喊得近。
 *   它通过 F.pref("manner") 进入公式，配置分支与实际消耗同源。
 */
namespace PokemonSkills {
    export const tormentId = "torment";
    export const tormentEffect = "world_combat:torment_itch";
    export const tormentMark = "world_combat:torment_tally";
    export const tormentStatus = "torment";
    export const tormentScene = "world_combat:move_torment";
    export const tormentLockText = "world_combat.move.torment.text.lock";
    export const tormentTurnText = "world_combat.move.torment.text.turn";
    export const tormentFadeText = "world_combat.move.torment.text.fade";
    export const tormentBlockText = "world_combat.move.torment.text.block";

    actionParameters.define(tormentId, {
        reach: formula(
            F.base(9)
                .plus(F.stat("specialAttack").times(0.03))
                .plus(F.body("height").times(1.5))
                .times(F.when(F.pref("manner"), F.const(1.0), F.const(0.85)))
                .clamp(6, 20).round(1),
            "取笑距离", {
                unit: "格",
                description: "这句取笑能送到多远；特攻越高、身板越大喊得越远。怒斥比讥讽短。它也是本招的实际射程来源。"
            }),
        tormentTicks: seconds(
            F.base(200)
                .plus(F.level().times(1.2))
                .plus(F.stat("specialAttack").times(0.5))
                .times(F.when(F.pref("manner"), F.const(1.25), F.const(0.8)))
                .clamp(140, 420).round(0),
            "烦躁时长", "目标在这段时间内不能连续使用同一招；等级越高越久，特攻给这句取笑更长的余味。讥讽更久，怒斥更短。"),
        irritation: formula(
            F.base(8).plus(F.stat("specialAttack").div(6)).clamp(8, 24).round(0),
            "烦躁值", {
                unit: "点",
                description: "缠在目标身上的讥讽符环与碎点数量；特攻越高越密，也驱动持续画面的节奏。"
            }),
        tempo: seconds(
            F.base(8).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("manner"), F.const(2), F.const(-2)))
                .clamp(4, 14).round(0),
            "起手", "把这句话说出口需要多久；速度越快越短，怒斥更利落、讥讽要多绕一拍。"),
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").times(0.01)).clamp(4, 9).round(0),
            "收势", "放完取笑之后的收势；速度越快越短。"),
        recharge: seconds(
            F.base(110).minus(F.stat("speed").times(0.1))
                .times(F.when(F.pref("manner"), F.const(1.15), F.const(0.85)))
                .clamp(50, 160).round(0),
            "冷却", "两次取笑之间的等待；速度快的个体更快，怒斥更省、讥讽更贵。")
    });

    describe(tormentId, [
        { key: "description.0", values: ["reach", "tormentTicks"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "manner.0", values: [], when: function (context) { return read(context.detail.values, ["manner"]) === 1; } },
        { key: "manner.1", values: [], when: function (context) { return read(context.detail.values, ["manner"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
