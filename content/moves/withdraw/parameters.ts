/**
 * 缩入壳中 / withdraw — 参数与数值来源。
 *
 * 原生事实：Water、变化、威力 —、命中必中、PP 40、目标 self、boosts { def: +1 }。
 *
 * 翻译：把「缩入壳里保护身体」翻成**真的把身体收进壳里、合上**——壳合上的一刻你钉在原地不动，
 *   壳面按次替你整个挡下来袭（挡几下就裂），防御也随手抬起来。取原生「防御 +1、PP 40、纯自我强化」；
 *   放弃回合制里永久保留的等级——即时交战里防御等级立刻写入公共能力阶梯，缩壳是一段可见窗口，
 *   壳裂、被清除或到期时等级一起收回。它是本族里唯一**放弃移动**的一招：把身位彻底交给壳，换几次硬挡。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift    防御等级：固定 1，原生「提高防御」的对位，是这招的身份常数。
 *   blocks  硬挡次数：基础 1 + 等级/45，深潜再 +1；夹 1..3。等级越高，壳能整个挡下的攻击越多。
 *   window  缩壳时长：基础 140 刻 + 等级×2 + 防御×0.4；深潜 ×1.2／浅缩 ×0.85；夹 90..320。
 *   shell   壳半径：基础 0.85 格 + 碰撞箱宽度×0.65；夹 0.8..1.8。体型越宽，壳包得越开（判定与表现同径）。
 *   plates  壳片数：基础 12 + 防御×0.08 + 等级×0.2；夹 10..34。防御与等级越高，拼成壳的片越多，粒子按它发射。
 *   tempo   起手：基础 9 刻 − 速度×0.02，深潜 +2；夹 5..13。越快的个体合壳越快。
 *   aftercast 收招：基础 5 刻 + 碰撞箱高度×1.2；夹 5..10。
 *   wait    冷却：基础 110 刻 − 等级×0.4，深潜 ×1.15／浅缩 ×0.9；夹 70..135。PP 40 的代价。
 * 配置 deep（深潜）双向取舍：开启＝壳更厚、多挡一次、持续更久，代价是合壳更慢、冷却更长、钉得更久；
 *   关闭＝浅缩，壳薄、只挡一次、更快合也更快开。硬吃一轮与快速脱离各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("withdraw", {
        /** 防御等级：原生 +1，本招的身份常数。 */
        gift: formula(F.const(1), "防御等级", {
            unit: " 级",
            description: "缩壳时把防御抬高多少级；原生「提高防御」的对位。"
        }),
        /** 硬挡次数：等级越高壳能整个挡下的攻击越多。 */
        blocks: formula(
            F.base(1).plus(F.level().div(45))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.withdraw.preference.deep")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "硬挡次数", {
                unit: " 次",
                description: "壳能整个挡下来袭的攻击次数；等级越高越多，深潜再 +1。挡满即裂。"
            }),
        /** 缩壳时长：等级与防御决定壳能撑多久。 */
        window: seconds(
            F.base(140).plus(F.level().times(2)).plus(F.stat("defence").times(0.4))
                .times(F.when(F.pref("deep", text("worldcombat.skill.withdraw.preference.deep")), F.const(1.2), F.const(0.85)))
                .clamp(90, 320).round(0),
            "缩壳时长", "壳在身上撑多久，也是被钉住的时间；等级与防御越高越久，深潜更久。壳裂或到期时这段防护抬起的等级一起收回。"),
        /** 壳半径：体型越宽包得越开。 */
        shell: formula(
            F.base(0.85).plus(F.body("width").times(0.65)).clamp(0.8, 1.8).round(2),
            "壳半径", {
                unit: " 格",
                description: "壳包住身体的半径；碰撞箱越宽包得越开，表现里的壳环就是这个半径。"
            }),
        /** 壳片数：防御与等级越高片越多。 */
        plates: formula(
            F.base(12).plus(F.stat("defence").times(0.08)).plus(F.level().times(0.2)).clamp(10, 34).round(0),
            "壳片数", {
                unit: " 片",
                description: "拼成这层壳的壳片数量；防御与等级越高片越多，粒子按它发射。"
            }),
        /** 起手：速度决定合壳多快，深潜更慢。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.withdraw.preference.deep")), F.const(2), F.const(0)))
                .clamp(5, 13).round(0),
            "起手", "收身、把壳合上需要多久；速度越快越短，深潜更慢（也更容易被打断）。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 10).round(0),
            "收招", "重新探出身体的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练，深潜更长。 */
        wait: seconds(
            F.base(110).minus(F.level().times(0.4))
                .times(F.when(F.pref("deep", text("worldcombat.skill.withdraw.preference.deep")), F.const(1.15), F.const(0.9)))
                .clamp(70, 135).round(0),
            "冷却", "两次缩壳之间的等待；等级越高越短，深潜更长。PP 40 的代价。")
    });

    stages("withdraw", [
        { level: 25, values: { window: 170, wait: 100 } },
        { level: 45, values: { window: 210, wait: 90 } }
    ]);

    describe("withdraw", [
        { key: "description.0", values: ["gift", "blocks", "window"] },
        { key: "description.1", values: ["shell", "plates"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
