/**
 * 芳香治疗 / Aromatherapy —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Grass、变化、威力 0、命中必中、PP 5、优先度 0、target allyTeam；
 *   onHit 对「自己一侧」的每个成员 cureStatus。它清的是全部主异常：中毒／剧毒、灼伤、麻痹、睡眠、冰冻。
 *
 * 世界化：把「放出一阵香、治好整队」翻成即时战斗里一片会停留的**香云**——云落在选定点，走进云里的伙伴
 *   被香气裹住，身上的有害状态效果当场化掉；云还在的时候，谁再被挂上异常都会被它继续化掉。它是**一块地方**，
 *   不是一下：可以提前铺在队友要经过的地方，也可以铺在缠斗点上反复净化（与「治愈铃声」那一下当场全清明确分开）。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   scentRadius  香气弥漫多广：特攻与体型高度决定；浓香档 ×0.75、弥香档 ×1.2。
 *   cloudTicks   香云停留多久：特防与等级决定；浓香档 ×1.3、弥香档 ×0.85。
 *   reach        香云能放到多远：等级决定；浓香档略近。
 *   motes        香雾点数量：特防与体型决定，直接驱动粒子。
 *   tempo        起手：速度决定；浓香档更慢。
 *   aftercast    收招：体型高度决定。
 *   recharge     冷却：等级提高熟练度；浓香档更长。
 * 配置 dense（浓香／弥香）双向取舍：浓香半径更小、起手更慢，但停留更久（罩得紧、香得久）；
 *   弥香铺得开、起手更快，但停留更短（覆盖广、留得短）。
 */
namespace PokemonSkills {
    export const aromatherapyId = "aromatherapy";
    export const aromatherapyScene = "world_combat:move_aromatherapy";
    export const aromatherapyField = "world_combat:field/aromatherapy";
    export const aromatherapyCleanseText = "world_combat.move.aromatherapy.text.cleanse";
    export const aromatherapySettleText = "world_combat.move.aromatherapy.text.settle";
    /** 表现里的参考半径：`data.scale = 实际香云半径 / 这个数`。 */
    export const aromatherapyReferenceRadius = 3.0;
    const aromatherapyDense = { key: "worldcombat.skill." + aromatherapyId + ".preference.dense" };

    actionParameters.define(aromatherapyId, {
        scentRadius: formula(
            F.base(3.0)
                .plus(F.stat("specialAttack").minus(50).times(0.008).clamp(-0.6, 1.4).as("特攻修正"))
                .plus(F.body("height").minus(1.2).times(0.4).clamp(-0.4, 0.8).as("体型修正"))
                .times(F.when(F.pref("dense", aromatherapyDense), F.const(0.75), F.const(1.2)).as("浓香"))
                .clamp(1.8, 5.5).round(2),
            "香气半径", { unit: " 格", description: "香云弥漫的半径；特攻越高、体型越大铺得越开，浓香档 ×0.75、弥香档 ×1.2。云的范围即判定。" }),
        cloudTicks: seconds(
            F.base(140).plus(F.stat("specialDefence").times(0.35)).plus(F.level().minus(20).max(0).times(0.8).as("等级修正"))
                .times(F.when(F.pref("dense", aromatherapyDense), F.const(1.3), F.const(0.85)).as("浓香"))
                .clamp(80, 360).round(0),
            "香云停留", "香云在原地停留多久；这段时间里走进来的伙伴会被反复净化，特防越高、等级越高越久。"),
        reach: formula(
            F.base(5).plus(F.level().minus(20).max(0).times(0.06).clamp(0, 2).as("等级修正"))
                .times(F.when(F.pref("dense", aromatherapyDense), F.const(0.9), F.const(1)).as("浓香"))
                .clamp(4, 8).round(2),
            "施放距离", { unit: " 格", description: "香云最远能放到哪里；等级越高越远，浓香档略近。" }),
        motes: formula(
            F.base(18).plus(F.stat("specialDefence").times(0.05)).plus(F.body("height").times(2)).clamp(12, 44).round(0),
            "香雾", { unit: " 点", description: "云里飘着的香雾点数量；特防与体型越大越多，粒子按它发射。" }),
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.04).clamp(-3, 3).as("速度修正"))
                .times(F.when(F.pref("dense", aromatherapyDense), F.const(1.15), F.const(0.9)).as("浓香"))
                .clamp(5, 16).round(0),
            "起手", "把香气拢起来送出去之前的准备；速度越快越短，浓香档更慢。准备期间不能移动，可被打断。"),
        aftercast: seconds(
            F.base(8).plus(F.body("height").minus(1.2).times(0.4).clamp(-1, 2)).clamp(5, 12).round(0),
            "收招", "香云铺开后的收势；身板越大收得稍慢。"),
        recharge: seconds(
            F.base(160).minus(F.level().times(0.6))
                .times(F.when(F.pref("dense", aromatherapyDense), F.const(1.1), F.const(0.95)).as("浓香"))
                .clamp(90, 200).round(0),
            "冷却", "两次香云之间的等待；等级越高越熟练，浓香档更长。")
    });

    stages(aromatherapyId, [
        { level: 45, values: { recharge: 140 } },
        { level: 65, values: { recharge: 118 } }
    ]);

    describe(aromatherapyId, [
        { key: "description.0", values: ["scentRadius", "cloudTicks"] },
        { key: "description.1", values: ["reach"] },
        { key: "stance.dense", values: [], when: function (context) { return read(context.detail.values, ["dense"]) === true; } },
        { key: "stance.diffuse", values: [], when: function (context) { return read(context.detail.values, ["dense"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
