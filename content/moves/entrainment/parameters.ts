/**
 * 找伙伴 / entrainment — 参数与机制数值来源。
 *
 * 核心念头：踩出一段古怪的节拍，让它在对手身上落定，逼它跟着自己的节奏动——于是它的特性也变成了自己的。
 *   节奏是会被周围听去的：节拍在目标处炸开，附近被波及的敌人一起跟着改。
 * 原生：Normal／变化／命中 100／PP 15／单体；`onTryHit` 在目标与自己相同、目标带 cantsuppress、
 *   目标特性是 truant、或自己特性带 noentrain 时失败；命中后把目标的特性置为源特性。
 * 即时化用共享 NativeModifiers ability 层承载（到期自动还原），并挂共享身份
 *   `world_combat:status/entrainment` 的标记；同一段节拍里被波及到的其他敌人一起改变。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach     节奏射程：个头与速度决定这段节拍能送到多远。它也是本招实际射程的来源。
 *   velocity  节拍速度：速度与特攻共同决定拍子跑得多快。
 *   splash    波及半径：等级与特攻决定节拍在目标处扩散多大，配置「全场节拍」再放大或收窄。
 *   tempo     起舞起手：速度决定踩出节拍多快。
 *   aftercast 收势：特防决定舞步停得多稳。
 *   hold      模仿时长：等级与特防支撑对手跟着跳多久。
 *   recharge  冷却：速度决定多久能再踩一段。
 *   beats     节拍数：速度决定沿连线排开的拍子数量。
 *   sway      摆幅数：特攻决定落在对手身上时那一圈摆动的密度。
 * 配置项 whole（全场节拍／贴身节拍）：全场扩散更大但每只维持更短、冷却更长；
 *   贴身收窄但维持更久、冷却更短。覆盖范围和持续时长互相取舍。
 */

namespace PokemonSkills {
    actionParameters.define("entrainment", {
        reach: formula(
            F.base(8, "基础")
                .plus(F.body("height").minus(1.4).times(1.2).as("体型"))
                .plus(F.stat("speed").minus(40).div(28).clamp(-1, 2.6).as("速度"))
                .clamp(5, 15).round(1),
            "节奏射程", { unit: "格", description: "这段节拍能送到多远；个头越高、速度越快送得越远。它也是本招实际射程的来源。" }),
        velocity: formula(
            F.base(0.9, "基础")
                .plus(F.stat("speed").div(3200).as("速度"))
                .plus(F.stat("specialAttack").div(6000).as("特攻"))
                .clamp(0.6, 1.5).round(2),
            "节拍速度", { unit: "格/刻", description: "拍子沿连线跑动的速度；速度与特攻越大越快。" }),
        splash: formula(
            F.base(3.2, "基础")
                .plus(F.level().minus(25).times(0.05).clamp(0, 1.6).as("等级"))
                .plus(F.stat("specialAttack").div(90).as("特攻"))
                .times(F.when(F.pref("whole").as("全场节拍"), F.const(1.6), F.const(0.7)).as("扩散范围"))
                .clamp(1.6, 7).round(1),
            "波及半径", { unit: "格", description: "节拍在目标处炸开、能影响多大一圈敌人；等级与特攻越大越广，全场节拍再放大。" }),
        tempo: seconds(
            F.base(8, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 5).as("速度")).clamp(3, 11).round(),
            "起舞起手", "踩出这段节拍所需时间；速度越快起得越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(48).clamp(-1, 2.2).as("特防")).clamp(4, 11).round(),
            "收势", "舞步停下后的收势；特防越高压得越稳。"),
        hold: seconds(
            F.base(120, "基础")
                .plus(F.level().times(2.8).as("等级"))
                .plus(F.stat("specialDefence").div(3.6).as("特防"))
                .times(F.when(F.pref("whole").as("全场节拍"), F.const(0.65), F.const(1.4)).as("维持深浅"))
                .clamp(60, 1100).round(),
            "模仿时长", "对手跟着这段节奏、特性被顶替多久；等级与特防越高越久，贴身节拍再延长。"),
        recharge: seconds(
            F.base(80, "基础").minus(F.stat("speed").times(0.28).as("速度")).clamp(36, 120).round(),
            "再踩冷却", "再踩一段节拍需要多久；速度快的个体更快恢复。", { base: 80 }),
        beats: formula(
            F.base(6, "基础").plus(F.stat("speed").div(60).as("速度")).clamp(6, 18).round(),
            "节拍数", { unit: "拍", description: "沿施法者到目标的连线排开的拍子数量；速度越快越密。" }),
        sway: formula(
            F.base(8, "基础").plus(F.stat("specialAttack").div(8).as("特攻")).clamp(8, 28).round(),
            "摆幅数", { unit: "点", description: "落在目标身上时那一圈摆动的密度；特攻越高越密。" })
    });

    stages("entrainment", [{ level: 35, values: { recharge: 68 } }, { level: 50, values: { recharge: 58 } }]);

    describe("entrainment", [
        { key: "world", values: ["hold"] },
        { key: "description.0", values: ["reach", "tempo", "velocity"] },
        { key: "description.1", values: ["hold", "splash"] },
        { key: "whole.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.whole); } },
        { key: "whole.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.whole); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level"] },
        { key: "growth.1", values: ["tier.1.level"] }
    ]);
}
