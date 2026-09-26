/**
 * 看我嘛 / Follow Me —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中必中、PP 20、优先度 +2、目标 self；
 *   onTry 要求 activePerHalf > 1（双打及以上），命中挂 volatile `followme`，duration 1，让对手本回合只瞄准自己。
 *
 * 世界化：没有回合，把「这一回合所有人只看我」翻成即时里一段被喊住的注意——站在原地抬手招呼，
 *   第一声对身边的敌人各发一次原生仇恨请求（world.target），之后只维持那些已经回应的：把原本打向同伴的火力牵过来。
 *   它不限属性、不限目标类型（不像愤怒粉怕草属性），是纯粹的一嗓子；也不强迫命中，玩家与免疫转向的 Boss 可以拒绝。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   callRadius  喊话半径：等级与特攻决定能喊到多远；喊话式更宽、招手式更窄。
 *   callTicks   喊住时长：等级与特防决定注意被拉住多久；喊话式更短、招手式更久。
 *   interval    牵引节奏：速度决定每隔多久把已回应的敌人重新指向一次。
 *   motes       注目光点：特攻决定粒子的数量。
 *   tempo／aftercast／recharge：起手（原生 +2 优先度，很短）、收招、冷却，随速度与等级变化。
 * 配置 shout（喊话／招手）双向取舍：喊话＝范围 ×1.25、冷却 ×1.1，但喊住时长 ×0.7（一嗓子扫广但不持久）；
 *   招手＝范围 ×0.8，却把时长 ×1.35、冷却 ×0.9（盯住近处一小撮更久）。两边各有局面。
 */
namespace PokemonSkills {
    export const followMeId = "followme";
    export const followMeEffect = "world_combat:followed";
    export const followMeMark = "world_combat:follow_me_call";
    export const followMeScene = "world_combat:move_followme";
    export const followMeStatus = "followme";
    export const followMeTextCall = "world_combat.move.followme.text.call";
    export const followMeTextFade = "world_combat.move.followme.text.fade";
    const followMeShout = { key: "worldcombat.skill." + followMeId + ".preference.shout" };

    actionParameters.define(followMeId, {
        callRadius: formula(
            F.base(6).plus(F.level().times(0.08)).plus(F.stat("specialAttack").times(0.02))
                .times(F.when(F.pref("shout", followMeShout), F.const(1.25), F.const(0.8)))
                .clamp(3.5, 14).round(1),
            "喊话半径", { unit: " 格", description: "这一嗓子能把多远的敌人拉向自己；等级与特攻越高越远，喊话式更宽、招手式更窄。" }),
        callTicks: seconds(
            F.base(90).plus(F.level().times(1.5)).plus(F.stat("specialDefence").times(0.4))
                .times(F.when(F.pref("shout", followMeShout), F.const(0.7), F.const(1.35)))
                .clamp(45, 260).round(0),
            "喊住时长", "注意被拉住多久；等级与特防越长，喊话式更短、招手式更久。"),
        interval: seconds(
            F.base(16).minus(F.stat("speed").times(0.03)).clamp(8, 24).round(0),
            "牵引节奏", "每隔多久把已回应的敌人重新指向自己一次；速度越快越勤。"),
        motes: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.08)).clamp(16, 48).round(0),
            "注目光点", { unit: " 点", description: "招呼时迸出的注目光点数量；特攻越高越多，粒子按它发射。" }),
        tempo: seconds(
            F.base(5).minus(F.stat("speed").times(0.02)).clamp(2, 8).round(0),
            "起手", "抬手招呼需要多久；速度越快越短（原生优先度 +2，很短）。"),
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").times(0.01)).clamp(2, 8).round(0),
            "收招", "喊完之后的收势；速度越快收得越短。"),
        recharge: seconds(
            F.base(120).minus(F.level().times(0.5))
                .times(F.when(F.pref("shout", followMeShout), F.const(1.1), F.const(0.9)))
                .clamp(60, 170).round(0),
            "冷却", "两次招呼之间的等待；等级越高越短，喊话式略长。")
    });

    describe(followMeId, [
        { key: "description.0", values: ["callRadius","callTicks"] },
        { key: "description.1", values: ["interval"] },
        { key: "shout.on", values: [], when: function (context) { return read(context.detail.values, ["shout"]) === true; } },
        { key: "shout.off", values: [], when: function (context) { return read(context.detail.values, ["shout"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] }
    ]);
}
