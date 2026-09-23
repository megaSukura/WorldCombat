/**
 * 水流环 / Aqua Ring —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Water、变化、威力 0、命中必中、PP 20、优先度 0、目标 self；
 *   命中挂 volatile `aquaring`，condition.onResidual 每回合回复 baseMaxhp/16。
 *
 * 世界化：把「每回合回 1/16」翻成即时世界里一条挂在施法者身上的水幕——一挂上就自己按钟回血，
 *   随移动与交战继续存在，直到走完时间或被清除。它是一条真正的 MobEffect（共享身份
 *   world_combat:status/aquaring，物品栏可见、/effect 可用、牛奶可解），旁边挂一枚机读标记带走间隔、
 *   每次回量、起止时刻与表现数值。它和「睡觉」的分别：不用站定、持续小额、可以边走边回。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   pulse       每次回量：特防决定水幕的厚度；下雨时更旺（真实环境降雨，0..1）。
 *   interval    回血间隔：速度决定水幕多久涌一次。
 *   ringTicks   水幕存续：等级与特防撑多久；涌泉式更短、细流式更久。
 *   veilRadius  水幕半径：碰撞箱高度决定环绕身体的范围，表现按它缩放。
 *   motes       水光点数：特防决定粒子量。
 *   tempo／aftercast／recharge：起手、收招、冷却，随速度与等级变化。
 * 配置 spring（涌泉／细流）双向取舍：涌泉＝回得更快更多（间隔 ×0.65、回量 ×1.35），但存续 ×0.7（短促的猛回）；
 *   细流＝回得慢而少，却把存续拉到 ×1.25（长线的稳定续航）。涌泉压缩回血节奏，细流提供更长的续航。
 */
namespace PokemonSkills {
    export const aquaRingId = "aquaring";
    export const aquaRingEffect = "world_combat:aqua_ring";
    export const aquaRingMark = "world_combat:aqua_ring_mark";
    export const aquaRingScene = "world_combat:move_aquaring";
    export const aquaRingStatus = "aquaring";
    export const aquaRingTextVeil = "world_combat.move.aquaring.text.veil";
    export const aquaRingTextPulse = "world_combat.move.aquaring.text.pulse";
    const aquaRingSpring = { key: "worldcombat.skill." + aquaRingId + ".preference.spring" };
    const aquaRingRain = text("worldcombat.skill." + aquaRingId + ".value.rainfall");

    actionParameters.define(aquaRingId, {
        pulse: percent(
            F.base(0.025).plus(F.stat("specialDefence").times(0.00015)).plus(F.world("rain", aquaRingRain).times(0.006))
                .times(F.when(F.pref("spring", aquaRingSpring), F.const(1.35), F.const(1.0)))
                .clamp(0.02, 0.06),
            "每次回量", "水幕每涌一次回复的已损失生命比例；特防越高、雨越大回得越多，涌泉式再 ×1.35。"),
        interval: seconds(
            F.base(50).minus(F.stat("speed").times(0.08))
                .times(F.when(F.pref("spring", aquaRingSpring), F.const(0.65), F.const(1.0)))
                .clamp(25, 70).round(0),
            "回血间隔", "水幕每隔多久涌一次；速度越快越密，涌泉式再 ×0.65。"),
        ringTicks: seconds(
            F.base(280).plus(F.level().times(4)).plus(F.stat("specialDefence").times(1.0))
                .times(F.when(F.pref("spring", aquaRingSpring), F.const(0.7), F.const(1.25)))
                .clamp(160, 760).round(0),
            "水幕存续", "水幕在身上挂多久；等级与特防越高越久，涌泉式更短、细流式更久。走完或被清除即结束。"),
        veilRadius: formula(
            F.base(1.5).plus(F.body("height").times(0.5)).clamp(1.2, 3.0).round(2),
            "水幕半径", { unit: " 格", description: "水幕环绕身体的半径；体型越大越宽，表现按它缩放。" }),
        motes: formula(
            F.base(14).plus(F.stat("specialDefence").times(0.06)).clamp(12, 40).round(0),
            "水光点数", { unit: " 点", description: "水幕里浮起的水光点数量；特防越高越多，粒子按它发射。" }),
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.025)).clamp(4, 13).round(0),
            "起手", "把水幕拢到身上需要多久；速度越快越短。"),
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").times(0.02)).clamp(3, 9).round(0),
            "收招", "水幕合拢后的收势；速度越快收得越利落。"),
        recharge: seconds(
            F.base(150).minus(F.level().times(0.5)).clamp(80, 200).round(0),
            "冷却", "两次铺开之间的等待；等级越高越熟练。")
    });

    stages(aquaRingId, [
        { level: 45, values: { ringTicks: 460 } },
        { level: 60, values: { ringTicks: 560 } }
    ]);

    describe(aquaRingId, [
        { key: "description.0", values: ["pulse", "interval"] },
        { key: "description.1", values: ["ringTicks"] },
        { key: "description.2", values: [] },
        { key: "spring.on", values: [], when: function (context) { return read(context.detail.values, ["spring"]) === true; } },
        { key: "spring.off", values: [], when: function (context) { return read(context.detail.values, ["spring"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ringTicks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ringTicks"] }
    ]);
}
