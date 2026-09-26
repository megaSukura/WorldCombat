/**
 * 净化 / Purify —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Poison、变化、威力 0、命中必中、PP 20、优先度 0、target normal；
 *   onHit 若目标 cureStatus 成功，则施法者回复自身最大 HP 的 50%（失败则不回复）。它清的是目标身上的主异常。
 *
 * 世界化：把「摸一下目标、把病痛拿走、换来自己的生命」翻成即时战斗里的一次**抽取**——施法者朝瞄准处探出手，
 *   直接点到谁就抽谁，只瞄到地面时才在落点 captureRadius 内取最近的带异常者（伙伴或对手都行）；把它身上的
 *   有害状态效果整项抽出来，暗雾沿一条线飞回施法者，落地化成生命。它是一个**单点**的转化：净化的是别人，
 *   回血的是自己（与「治愈铃声」「芳香治疗」那种整队范围净化分开）。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   heal          回复比例：以**目标最大生命**为基数，特攻与等级决定抽出多少生机；深引档 ×1.25、轻引档 ×0.85。
 *   reach         施放距离：等级决定；深引档略近。
 *   captureRadius 选中范围：体型高度决定（大个子更好抓）；深引档更小（要贴得更准）。
 *   motes         抽出与回血的粒子量：特防与体型决定。
 *   tempo         起手：速度决定；深引档更慢。
 *   aftercast     收招：体型高度决定。
 *   recharge      冷却：等级提高熟练度；深引档更长。
 * 配置 deep（深引／轻引）双向取舍：深引回复 ×1.25，代价是起手 ×1.25、冷却 ×1.15、选中范围 ×0.85、距离 ×0.9；
 *   轻引更快、更好抓、够得更远，但回复只有 ×0.85（一次顺手的顺手净化）。
 */
namespace PokemonSkills {
    export const purifyId = "purify";
    export const purifyScene = "world_combat:move_purify";
    export const purifyDrawText = "world_combat.move.purify.text.draw";
    export const purifyAbsorbText = "world_combat.move.purify.text.absorb";
    export const purifyNoneText = "world_combat.move.purify.text.none";
    const purifyDeep = { key: "worldcombat.skill." + purifyId + ".preference.deep" };

    actionParameters.define(purifyId, {
        heal: percent(
            F.base(0.34)
                .plus(F.stat("specialAttack").minus(50).times(0.0012).clamp(-0.08, 0.18).as("特攻修正"))
                .plus(F.level().minus(20).max(0).times(0.001).clamp(0, 0.06).as("等级修正"))
                .times(F.when(F.pref("deep", purifyDeep), F.const(1.25), F.const(0.85)).as("深引"))
                .clamp(0.20, 0.65).round(3),
            "回复比例", "抽出异常后，施法者按**目标最大生命**的这一比例回复；特攻越高、等级越高抽出的生机越多，深引档 ×1.25。"),
        reach: formula(
            F.base(4).plus(F.level().minus(20).max(0).times(0.05).clamp(0, 1.2).as("等级修正"))
                .times(F.when(F.pref("deep", purifyDeep), F.const(0.9), F.const(1.05)).as("深引"))
                .clamp(3, 7).round(2),
            "施放距离", { unit: " 格", description: "探出手能碰到多远；等级越高越远，深引档略近。" }),
        captureRadius: formula(
            F.base(1.2).plus(F.body("height").minus(1.2).times(0.5).clamp(-0.2, 0.4).as("体型修正"))
                .times(F.when(F.pref("deep", purifyDeep), F.const(0.85), F.const(1.15)).as("深引"))
                .clamp(0.9, 2.0).round(2),
            "选中范围", { unit: " 格", description: "只瞄到地面时，在落点这个半径内挑最近的一个带异常的战斗者；直接点到实体则以该实体为准。体型越大越好抓，深引档要贴得更准。" }),
        motes: formula(
            F.base(18).plus(F.stat("specialDefence").times(0.05)).plus(F.body("height").times(2)).clamp(12, 40).round(0),
            "抽引之雾", { unit: " 点", description: "抽出病痛与落地回血时的粒子量；特防与体型越大越多，粒子按它发射。" }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.035).clamp(-3, 3).as("速度修正"))
                .times(F.when(F.pref("deep", purifyDeep), F.const(1.25), F.const(0.9)).as("深引"))
                .clamp(5, 15).round(0),
            "起手", "探手抽出病痛之前的准备；速度越快越短，深引档更慢。准备期间不能移动，可被打断。"),
        aftercast: seconds(
            F.base(7).plus(F.body("height").minus(1.2).times(0.4).clamp(-1, 2)).clamp(4, 11).round(0),
            "收招", "抽引落定后的收势；身板越大收得稍慢。"),
        recharge: seconds(
            F.base(130).minus(F.level().times(0.5))
                .times(F.when(F.pref("deep", purifyDeep), F.const(1.15), F.const(0.92)).as("深引"))
                .clamp(70, 170).round(0),
            "冷却", "两次抽引之间的等待；等级越高越熟练，深引档更长。", { base: 130 })
    });

    stages(purifyId, [
        { level: 45, values: { recharge: 115 } },
        { level: 65, values: { recharge: 96 } }
    ]);

    describe(purifyId, [
        { key: "description.0", values: ["heal","reach"] },
        { key: "description.1", values: ["captureRadius"] },
        { key: "stance.deep", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "stance.light", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level"] },
        { key: "growth.1", values: ["tier.1.level"] }
    ]);
}
