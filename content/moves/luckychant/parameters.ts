/** Grant radius and carried blessing duration; preferences change the same values shown and used. */
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
            F.base(260).plus(F.level().times(2)).plus(F.stat("specialAttack").times(0.4)).clamp(180, 560).times(F.when(F.choice("wish", "early"), F.const(0.7), F.const(1.3))).max(90).round(0),
            "祝福时长", "祝福能维持多久；等级与特攻让这句咒语唱得更久。"),
        chantRadius: formula(
            F.base(3.5).plus(F.body("height").times(0.9)).plus(F.stat("specialAttack").times(0.01)).clamp(3, 7).times(F.when(F.choice("wish", "early"), F.const(0.85), F.const(1.2))).max(1.5),
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
        { key: "description.2", values: [] },
        { key: "wish.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.wish === "early"); } },
        { key: "wish.1", values: [], when: function (context) { return !(context.detail && context.detail.values) || context.detail.values.wish !== "early"; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] }
    ]);
}
