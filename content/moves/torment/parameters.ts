/** torment：行为、参数与目标条件以本单元实现为准。 */
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
