/**
 * 精神噪音 / psychicnoise —— 参数、伤害段与回复封锁。
 *
 * 原生事实：Psychic／特殊／威力 75／命中 100／PP 10／flags 带 sound；secondary 100% volatile healblock
 *   （duration 2），期间「无法通过招式、特性或携带的道具回复 HP」（Cobblemon 1.8）。
 *
 * 翻译：一道令人不适的音波射出去——命中那一下是特殊伤害，之后目标耳里一直响着杂音，
 *   任何回复（招式、特性、携带物）都被这道噪音盖过去，直到噪音散去。
 *   与同族分开：挑衅封所有变化招式；地狱突刺封声音招式；精神噪音只封回复，且自己就是声音招式。
 *
 * 数据分散（每个参数各吃不同的精灵数据）：
 *   noise       威力随特攻与等级；贯穿式更轻。
 *   sealTicks   封回复时长随特攻与等级；贯穿式更短。
 *   reach       射程随特攻与体型高度。
 *   waveSpeed   音波速度随速度。
 *   radius      判定半径随体型高度。
 *   dissonance  画面密度随特攻（贯穿式更密）。
 *   tempo／settle／recharge 起手／收招／冷却随速度与等级。
 */
namespace PokemonSkills {
    export const psychicNoiseId = "psychicnoise";
    export const psychicNoiseScene = "world_combat:move_psychicnoise";
    export const psychicNoiseEffect = "world_combat:psychic_noise";
    export const psychicNoiseStatus = "healblock";
    export const psychicNoiseText = "world_combat.move.psychicnoise.text.sealed";
    export const psychicNoiseFadeText = "world_combat.move.psychicnoise.text.recovered";
    export const psychicNoiseFizzleText = "world_combat.move.psychicnoise.text.fizzle";

    // 回复封锁：任何走共享治疗入口（招式／特性／携带物）的回复，只要目标带着 healblock 身份就被清零。
    // 身份是共享的 world_combat:status/healblock，别的单元将来用同一个身份施加的封锁也一并生效。
    NativeEffects.healing.define({ id: "world_combat:move/psychicnoise/seal", apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, psychicNoiseStatus)) context.amount = 0;
    } });

    defineDamage(psychicNoiseId, "noise", {}, { sound: true });

    actionParameters.define(psychicNoiseId, {
        noise: formula(
            F.base(75).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-18, 55))
                .plus(F.level().minus(25).times(0.35).clamp(0, 12))
                .times(F.when(F.pref("pierce", text("worldcombat.skill.psychicnoise.preference.pierce")), F.const(0.8), F.const(1)))
                .clamp(48, 160).round(1),
            "音波威力", { unit: "威力", description: "命中结算的特殊威力；特攻越高、等级越高越刺耳。贯穿式更轻。对手特防、相性与暴击在命中时另算。" }),
        sealTicks: seconds(
            F.base(120).plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-10, 26))
                .plus(F.level().minus(20).max(0).times(1.2).clamp(0, 36))
                .times(F.when(F.pref("pierce", text("worldcombat.skill.psychicnoise.preference.pierce")), F.const(0.85), F.const(1)))
                .clamp(90, 260).round(0),
            "封回复时长", "目标多久无法通过招式、特性或携带物回复 HP；特攻越高、等级越高响得越久。"),
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 6))
                .plus(F.body("height").minus(1.4).times(0.8).clamp(-0.3, 2)).clamp(8, 18).round(1),
            "射程", { unit: "格", description: "音波能送到多远；特攻越高、身形越大传得越远。它也是本招的实际射程。" }),
        waveSpeed: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.4)).clamp(0.75, 1.5).round(2),
            "音波速度", { unit: "格/刻", description: "音波飞行速度；快个体更难在到达前走开。" }),
        radius: formula(
            F.base(0.36).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.06, 0.26)).clamp(0.3, 0.66).round(2),
            "判定半径", { unit: "格", description: "音波的横向判定半径；大个子发出的音波更宽。" }),
        dissonance: formula(
            F.base(26).plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-8, 40)).clamp(16, 80).round(0),
            "杂音量", { unit: "点", description: "音波与命中画面的粒子密度；特攻越高噪音越密，贯穿式再密一档。" }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.04).clamp(-2.5, 4)).clamp(6, 13).round(0),
            "起手", "把这道令人不适的杂音凝住放出去需要多久；快个体更早出声。"),
        settle: seconds(F.base(8).clamp(5, 14).round(0), "收招", "音波脱手之后收势的时间。"),
        recharge: seconds(
            F.base(90).minus(F.level().minus(20).max(0).times(0.8).clamp(0, 40)).clamp(55, 130).round(0),
            "冷却", "两次啸叫之间的等待；等级越高越熟练。")
    });

    stages(psychicNoiseId, [
        { level: 45, values: { noise: 95, sealTicks: 170 } }
    ]);

    describe(psychicNoiseId, [
        { key: "description.0", values: ["noise", "sealTicks"] },
        { key: "description.1", values: ["reach", "waveSpeed", "radius"] },
        { key: "description.2", values: ["dissonance", "tempo", "settle", "recharge"] },
        { key: "pierce.on", values: [], when: function (context) { return read(context.detail.values, ["pierce"]) === true; } },
        { key: "pierce.off", values: [], when: function (context) { return read(context.detail.values, ["pierce"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.noise", "tier.0.sealTicks"] }
    ]);
}
