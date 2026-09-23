/**
 * 青草搅拌器 / leaftornado 的参数与伤害段。
 *
 * 原生事实：Grass、特殊、威力 65、命中 90、PP 10、目标单体，50% 概率降低 1 级命中（Cobblemon 1.8 / Showdown）。
 *
 * 翻译：把「用锋利的叶片包裹住对手」翻成即时战斗里的一圈持久旋风——叶片在落点四周立起、旋转切割，
 * 持续若干拍，每一拍都割伤范围内的敌人，并按概率把叶屑扑进眼睛、削掉命中。它不是一颗弹丸，
 * 而是一块留在场上几秒的区域；对手可以走出旋风躲开后续的切割，这一点玩家能从画面读出来。
 *
 * 数值来源（每项读不同的个体数据）：
 *   shred    每拍切割威力，特攻为主、等级为辅；紧裹每拍 ×1.35、广旋 ×0.8。
 *   radius   体型高度与特攻决定旋风半径；紧裹 ×0.7、广旋 ×1.3。
 *   duration 特攻与等级决定旋风持续多久。
 *   interval 速度决定每拍间隔，越快切得越密。
 *   reach    特攻决定能把旋风立到多远。
 *   blindChance 原生 50% 的致盲概率；紧裹再 +15%。
 *   blind    特攻每满 110 加一级命中下降。
 *   blades   特攻与等级决定每拍卷起的叶片数，同时驱动表现。
 *   tempo    速度决定起手，紧裹多花一点时间。
 * 配置 tight（紧裹）双向取舍：半径更小、但每拍更重、致盲概率更高；广旋覆盖更广、每拍更轻。
 */
namespace PokemonSkills {
    actionParameters.define("leaftornado", {
        shred: formula(
            F.base(12).plus(F.stat("specialAttack").minus(50).times(0.10).clamp(-3, 12))
                .plus(F.level().minus(25).times(0.2).clamp(0, 8))
                .times(F.when(F.pref("tight"), F.const(1.35), F.const(0.8)))
                .clamp(8, 32).round(1),
            "切割威力", {
                unit: "威力",
                description: "旋风每一拍割在每个目标身上的基础威力；特攻与等级越高越利，紧裹每拍更重、广旋更轻。对手防御、相性与暴击在命中时另算。"
            }),
        radius: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.6))
                .plus(F.stat("specialAttack").minus(50).times(0.008).clamp(-0.4, 1.2))
                .times(F.when(F.pref("tight"), F.const(0.7), F.const(1.3)))
                .clamp(1.6, 4.4).round(2),
            "旋涡半径", {
                unit: "格",
                description: "叶片旋风罩住的半径，也是判定与画面的范围；大个子、特攻高更广，紧裹收得更小。"
            }),
        duration: seconds(
            F.base(40).plus(F.stat("specialAttack").minus(50).times(0.5).clamp(-10, 30))
                .plus(F.level().minus(25).times(0.4).clamp(0, 14)).clamp(40, 100).round(),
            "旋涡时长", "叶片在场上旋多久；期间每一拍都切割、掷概率致盲。"),
        interval: seconds(
            F.base(12).minus(F.stat("speed").minus(50).times(0.03).clamp(-3, 4)).clamp(8, 16).round(),
            "拍间隔", "两拍之间隔多久；速度越快切得越密。"),
        reach: formula(
            F.base(11).plus(F.stat("specialAttack").minus(50).times(0.05)).clamp(11, 18).round(1),
            "施放距离", {
                unit: "格",
                description: "能把旋风立在多远的目标位置；特攻高的个体放得更远。"
            }),
        blindChance: percent(
            F.base(0.5).plus(F.when(F.pref("tight"), F.const(0.15), F.const(0))).clamp(0.2, 0.75),
            "致盲概率", "每一拍把叶屑扑进目标眼睛、削掉命中的概率；紧裹更高。"),
        blind: formula(
            F.stat("specialAttack").div(110).floor().plus(1).clamp(1, 2),
            "命中下降", {
                unit: "级",
                description: "致盲成功时削掉的命中能力等级；特攻每满 110 多加一级。"
            }),
        blades: formula(
            F.base(10).plus(F.stat("specialAttack").minus(50).times(0.1))
                .plus(F.level().minus(25).times(0.3)).clamp(8, 36).round(),
            "叶片数", {
                unit: "片",
                description: "每拍在旋风里翻卷的叶片数，也驱动表现的密度；特攻与等级越高越多。"
            }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(50).times(0.04))
                .plus(F.when(F.pref("tight"), F.const(2), F.const(0))).clamp(5, 16).round(),
            "起手", "召起叶片的时间；速度越快越短，紧裹多花一点。")
    });

    defineDamage("leaftornado", "shred", {});

    describe("leaftornado", [
        { key: "description.0", values: ["shred", "blindChance", "blind"] },
        { key: "description.1", values: ["radius", "duration", "interval"] },
        { key: "description.2", values: ["reach", "pref.tight"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
