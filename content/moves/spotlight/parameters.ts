/**
 * 聚光灯 / Spotlight —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Normal、变化、威力 0、命中 必中、PP 15、优先度 +3、单体；
 *   目标获得 volatile spotlight，本回合其他人的招式被改瞄到该目标。
 *
 * 世界化：把一束光从手里打出去钉在对手身上。被照亮的对手**无处可躲**：落在它身上的伤害更重，
 *   而且它成为全场焦点——施法者一侧的原版生物会被指向它（world.target），把「只瞄准它」的意思落成实际行为。
 *   光束沿施法者与目标画出来，距离与范围一眼可读。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   reach       照射距离：基础 10 格 + 速度/100，夹 9..14；快的个体把光打得更远。
 *   expose      暴露加成：基础 18% + 特攻/900，夹 12%..45%；穿刺 ×1.4、钉住 ×0.75。特攻越高照得越刺眼。
 *   spotTicks   照明时长：基础 140 刻 + 等级×1.2 + 特攻×0.2，穿刺 ×0.7、钉住 ×1.3，夹 100..340。
 *   sweepRadius 光束扫过的范围：基础 4 格 + 身高×0.8，夹 3..7；体型越大，被指向它的同伴越多。
 *   motes       聚光光点：基础 20 + 特攻×0.06，夹 14..40；光柱与持续亮光的粒子量。
 *   tempo / aftercast / recharge：起手、收招、冷却，随速度与等级变化。
 * 配置 mode（穿刺／钉住）双向取舍：穿刺＝暴露 ×1.4 但时长短（一次打破口）；钉住＝暴露 ×0.75 但时长 ×1.3（长时间牵制）。
 */
namespace PokemonSkills {
    export const spotlightId = "spotlight";
    export const spotlightEffect = "world_combat:spotlighted";
    export const spotlightMark = "world_combat:spotlight_mark";
    export const spotlightScene = "world_combat:move_spotlight";
    export const spotlightStatus = "spotlight";
    export const spotlightBeamText = "world_combat.move.spotlight.text.beam";
    export const spotlightFlareText = "world_combat.move.spotlight.text.flare";
    export const spotlightFadeText = "world_combat.move.spotlight.text.fade";

    actionParameters.define(spotlightId, {
        reach: formula(
            F.base(10).plus(F.stat("speed").div(100).min(4)).clamp(9, 14).round(1),
            "照射距离", { unit: " 格", description: "光束能钉到多远的目标身上；速度越快打得越远。" }),
        expose: percent(
            F.base(0.18).plus(F.stat("specialAttack").div(900).min(0.27))
                .times(F.when(F.pref("mode"), F.const(0.75), F.const(1.4)))
                .clamp(0.1, 0.5).round(3),
            "暴露加成", "被照亮时受到的伤害额外增加的比例；特攻越高越刺眼，穿刺更高、钉住更低。"),
        spotTicks: seconds(
            F.base(140).plus(F.level().times(1.2)).plus(F.stat("specialAttack").times(0.2))
                .times(F.when(F.pref("mode"), F.const(1.3), F.const(0.7)))
                .clamp(100, 340).round(0),
            "照明时长", "对手被照亮多久；等级与特攻延长它，穿刺更短、钉住更久。"),
        sweepRadius: formula(
            F.base(4).plus(F.body("height").times(0.8)).clamp(3, 7).round(1),
            "扫过范围", { unit: " 格", description: "聚光扫过的范围；体型越大，能被指向它的同伴越多。" }),
        motes: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.06)).clamp(14, 40).round(0),
            "聚光光点", { unit: " 点", description: "光柱与持续亮光的粒子量；特攻越高越亮。" }),
        tempo: seconds(F.base(8).minus(F.stat("speed").times(0.015)).clamp(4, 11).round(0), "起手",
            "把光打出去需要多久；速度越快越短。"),
        aftercast: seconds(F.base(7).minus(F.stat("speed").times(0.01)).clamp(3, 9).round(0), "收招",
            "打完光之后的收势。"),
        recharge: seconds(F.base(70).minus(F.level().times(0.3)).clamp(40, 90).round(0), "冷却",
            "两次照射之间的等待；等级越高越熟练。")
    });

    describe(spotlightId, [
        { key: "description.0", values: ["expose","spotTicks"] },
        { key: "description.1", values: ["reach","sweepRadius"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "stance.pierce", values: [], when: function (context) { return read(context.detail.values, ["mode"]) !== 1; } },
        { key: "stance.pin", values: [], when: function (context) { return read(context.detail.values, ["mode"]) === 1; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] }
    ]);
}
