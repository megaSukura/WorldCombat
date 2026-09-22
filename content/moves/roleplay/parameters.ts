/**
 * 扮演 / roleplay — 参数与机制数值来源。
 *
 * 核心念头：读对手的特性，照着做一张一样的，披到自己身上一段时间。对手是样子，自己成了它。
 * 原生：Psychic／变化／必中／PP 10／单体；`onTryHit` 在双方特性相同、目标特性带 failroleplay、
 *       或自己带 cantsuppress 时失败；`onHit` 把自己的特性置换成目标的。即时化把特性保留成一段有寿命的层，
 *       走共享的 NativeModifiers ability 层（与腹鼓、纹理同一套临时覆盖机制），到期自动还原。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach     识别距离：体型与等级决定能描到多远的样子。
 *   tempo     入戏起手：速度决定描得多快。
 *   aftercast 收势：特防决定披上后站得多稳。
 *   hold      扮演时长：等级与特防支撑这层“扮相”维持多久。
 *   recharge  冷却：速度决定多久能改扮成下一个。
 *   traits    描摹线条数：特攻决定画面里绕对手描出的线条数量。
 * 配置项 dwell（深扮 / 浅饰）：深扮更久、冷却更长；浅饰更短、更便宜。时长与出手频率互相取舍。
 */

namespace PokemonSkills {
    actionParameters.define("roleplay", {
        reach: formula(
            F.base(8, "基础")
                .plus(F.body("height").minus(1.4).times(1.4).as("体型"))
                .plus(F.level().minus(30).times(0.06).clamp(0, 2.4).as("等级"))
                .clamp(6, 15).round(1),
            "识别距离", { unit: "格", description: "能描到多远之外的样子；个头越高、等级越高看得越远。它也是本招实际射程的来源。" }),
        tempo: seconds(
            F.base(8, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 6).as("速度")).clamp(3, 11).round(),
            "入戏起手", "描摹对手并披上身所需时间；速度越快入戏越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(45).clamp(-1.2, 2.5).as("特防")).clamp(5, 12).round(),
            "收势", "披上扮相后的收势；特防越高压得越稳。"),
        hold: seconds(
            F.base(140, "基础")
                .plus(F.level().times(3.2).as("等级"))
                .plus(F.stat("specialDefence").div(3.2).as("特防"))
                .times(F.when(F.pref("dwell"), F.const(1.7), F.const(0.6)).as("扮相深浅"))
                .clamp(90, 1200).round(),
            "扮演时长", "这层临时特性维持多久；等级与特防越高越久，深扮再延长，浅饰大幅缩短。"),
        recharge: seconds(
            F.base(90, "基础").minus(F.stat("speed").times(0.3).as("速度")).clamp(40, 130).round(),
            "冷却", "改扮成下一个特性需要多久；速度快的个体更快恢复。"),
        traits: formula(
            F.base(6, "基础").plus(F.stat("specialAttack").div(55).as("特攻")).clamp(6, 18).round(),
            "描摹线条", { unit: "条", description: "画面里绕对手描出的线条数量；特攻越高越密。" })
    });

    stages("roleplay", [{ level: 35, values: { cooldown: 70 } }, { level: 50, values: { cooldown: 60 } }]);

    describe("roleplay", [
        { key: "description.0", values: ["reach", "tempo"] },
        { key: "description.1", values: ["hold"] },
        { key: "description.2", values: ["traits"] },
        { key: "dwell.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.dwell); } },
        { key: "dwell.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.dwell); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
