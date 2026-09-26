/**
 * 找伙伴 / entrainment — 参数与机制数值来源。
 *
 * 核心念头：踩出一段古怪的节拍，让单个选中的对象跟着自己的节奏动——宝可梦的特性被带成自己的，
 *   普通生物的可读移动速度被朝自己拉近。节拍只落在一个明确选中者身上，不再成片覆盖。
 * 原生：Normal／变化／命中 100／PP 15／单体；`onTryHit` 在目标与自己相同、目标带 cantsuppress、
 *   目标特性是 truant、或自己特性带 noentrain 时失败；命中后把目标的特性置为源特性。
 * 即时化把宝可梦结果落成共享 NativeModifiers ability 层（到期自动还原），并挂共享身份
 *   `world_combat:status/entrainment` 的标记；普通生物改用有界原生属性修饰，把步速向施术者拉近。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach     节奏射程：个头与速度决定这段节拍能送到多远。它也是本招实际射程的来源。
 *   velocity  节拍速度：速度与特攻共同决定拍子跑得多快。
 *   tempo     起舞起手：速度决定踩出节拍多快。
 *   aftercast 收势：特防决定舞步停得多稳。
 *   hold      同步时长：等级与特防支撑目标跟着跳多久。
 *   blend     同步比例：特攻决定步速朝施术者拉近多少。
 *   pull      步速上限：等级决定一次同步最多改变原本步速的多大比例，给这条节拍上下限。
 *   recharge  冷却：速度决定多久能再踩一段。
 *   beats     节拍数：速度决定沿连线排开的拍子数量。
 *   sway      摆幅数：特攻决定落在对方身上时那一圈摆动的密度。
 * 配置项 snap（紧拍／缓拍）：紧拍把步速拉得更近但维持更短、冷却更长；缓拍拉得松些但维持更久、
 *   冷却更短。贴近程度与持续时间互相取舍。
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
            "节拍速度", { unit: "格/刻", description: "拍子跑向目标的速度；速度与特攻越大越快。" }),
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
                .times(F.when(F.pref("snap").as("紧拍"), F.const(0.7), F.const(1.3)).as("拍点"))
                .clamp(60, 1100).round(),
            "同步时长", "特性被顶替或步速被同步维持多久；等级与特防越高越久，缓拍拉得更长。"),
        blend: formula(
            F.base(0.35, "基础")
                .plus(F.stat("specialAttack").div(300).as("特攻"))
                .times(F.when(F.pref("snap").as("紧拍"), F.const(1.3), F.const(0.75)).as("拍点"))
                .clamp(0.2, 0.85).round(2),
            "同步比例", { unit: "比例", description: "普通生物朝施术者当前移动速度拉近多少；特攻越高拉得越近，紧拍再贴近一步。" }),
        pull: formula(
            F.base(0.4, "基础").plus(F.level().minus(20).times(0.004).clamp(0, 0.35).as("等级")).clamp(0.35, 0.8).round(2),
            "步速上限", { unit: "比例", description: "一次同步最多把目标的移动速度改变原本的多大比例，给这条节拍设一个上下限。" }),
        recharge: seconds(
            F.base(80, "基础").minus(F.stat("speed").times(0.28).as("速度"))
                .plus(F.when(F.pref("snap").as("紧拍"), F.const(12), F.const(-8)).as("拍点"))
                .clamp(36, 120).round(),
            "再踩冷却", "再踩一段节拍需要多久；速度快的个体更快恢复。", { base: 80 }),
        beats: formula(
            F.base(6, "基础").plus(F.stat("speed").div(60).as("速度")).clamp(6, 18).round(),
            "节拍数", { unit: "拍", description: "从施法者赶往目标时拍子拖出的密度；速度越快越密。" }),
        sway: formula(
            F.base(8, "基础").plus(F.stat("specialAttack").div(8).as("特攻")).clamp(8, 28).round(),
            "摆幅数", { unit: "点", description: "落到对方身上时那一圈摆动的密度；特攻越高越密。" })
    });

    stages("entrainment", [{ level: 35, values: { recharge: 68 } }, { level: 50, values: { recharge: 58 } }]);

    describe("entrainment", [
        { key: "world", values: ["hold", "pull"] },
        { key: "description.0", values: ["reach", "tempo", "velocity"] },
        { key: "description.1", values: ["hold", "blend"] },
        { key: "snap.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.snap); } },
        { key: "snap.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.snap); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level"] },
        { key: "growth.1", values: ["tier.1.level"] }
    ]);
}
