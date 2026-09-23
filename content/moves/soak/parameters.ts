/**
 * 浸水 / soak — 参数与机制数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：水、变化、威力 0、命中 100、PP 20、优先度 0、目标 normal（单体）；
 *   `onHit` 把目标的属性直接置成单一水属性，已经是纯水时失败。
 *
 * 世界化：即时战场用共享的临时属性层承载——往目标身上浇一道水柱，把它**当前的全部属性冲掉、换成单一水**。
 *   于是它自己得到水本系、防守面随之变成水的水抗与雷／草弱点。属性层由 NativeModifiers 的 types 层承担，
 *   到期自动还原原生属性；同时挂共享身份 `world_combat:status/soak` 的标记，别的作者可按身份消费。
 *   水浇过的地方会留下一小块湿泥（`world.terrain` 租借的真方块，水干了原方块回来）。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach    浇淋距离：体型与等级决定水柱能送到多远。它也是本招实际射程的来源。
 *   hold     浸透时长：等级与特攻决定水多难干，配置「漫流」把水摊薄、每只都更短。
 *   splash   漫流半径：体型宽度决定水花铺开的范围，也是判定圈与画面尺度。
 *   streaks  水柱条数：特攻决定从施法者冲到对手身上的水流条数（也驱动粒子数量）。
 *   ripples  水花圈数：速度决定落地后荡开的水花圈数（也驱动粒子数量）。
 *   puddle   湿泥留存：体重决定溅出的水量，以及那格湿泥留多久。
 *   tempo    起手：速度决定把水聚起来多快。
 *   aftercast 收势：特防决定浇完站得多稳。
 *   recharge 冷却：速度决定多久能再浇一次，漫流更费力。
 * 配置项 flood（漫流／细浇）：漫流一次浇透目标与身边一圈人、铺出湿泥，但每只维持更短、起手与冷却更久；
 *   细浇只盯一个目标，维持更久、出手更快更便宜。覆盖与持续互相取舍。
 */

namespace PokemonSkills {
    actionParameters.define("soak", {
        reach: formula(
            F.base(6, "基础")
                .plus(F.body("height").minus(1.4).times(1.4).as("体型"))
                .plus(F.level().minus(25).times(0.05).clamp(0, 2).as("等级"))
                .clamp(4, 12).round(1),
            "浇淋距离", { unit: "格", description: "水柱能浇到多远；个头越高、等级越高浇得越远。它也是本招实际射程的来源。" }),
        hold: seconds(
            F.base(200, "基础")
                .plus(F.level().times(3).as("等级"))
                .plus(F.stat("specialAttack").div(2.5).as("特攻"))
                .times(F.when(F.pref("flood", text("worldcombat.skill.soak.preference.flood")), F.const(0.75), F.const(1)).as("漫流摊薄"))
                .clamp(120, 900).round(),
            "浸透时长", "对手被冲成水属性多久；等级与特攻越高水越难干，漫流摊薄后每只都更短。"),
        splash: formula(
            F.base(1.6, "基础").plus(F.body("width").minus(0.9).times(1.1).as("体型")).clamp(1.2, 3.4).round(1),
            "漫流半径", { unit: "格", description: "水花铺开的半径，也是漫流档的判定圈；体型越宽越广。" }),
        streaks: formula(
            F.base(10, "基础").plus(F.stat("specialAttack").div(6).as("特攻")).clamp(10, 40).round(),
            "水柱条数", { unit: "道", description: "从施法者沿视线冲到对手身上的水流条数；特攻越高越粗壮，画面里的水流也按它画出。" }),
        ripples: formula(
            F.base(6, "基础").plus(F.stat("speed").div(28).as("速度")).clamp(6, 18).round(),
            "水花圈数", { unit: "圈", description: "落地后一圈圈荡开的水花数量；速度越快越密。" }),
        puddle: seconds(
            F.base(90, "基础").plus(F.body("weight").div(600).as("体重")).clamp(70, 220).round(),
            "湿泥留存", "被浇湿的表土留多久；越沉的目标溅出的水越多，湿泥留得越久。它是一格真方块，水干了原方块回来。"),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 4).as("速度")).clamp(5, 13).round(),
            "起手", "把水聚起来所需时间；速度越快起得越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(50).clamp(-1, 2).as("特防")).clamp(4, 11).round(),
            "收势", "浇完后的收势；特防越高压得越稳。"),
        recharge: seconds(
            F.base(88, "基础").minus(F.stat("speed").times(0.3).as("速度"))
                .plus(F.when(F.pref("flood", text("worldcombat.skill.soak.preference.flood")), F.const(18), F.const(-8)).as("漫流代价"))
                .clamp(40, 130).round(),
            "再浇冷却", "再浇一次需要多久；速度快的个体更快恢复，漫流更费力。")
    });

    stages("soak", [{ level: 40, values: { cooldown: 78 } }, { level: 55, values: { cooldown: 66 } }]);

    describe("soak", [
        { key: "description.0", values: ["hold"] },
        { key: "description.1", values: ["reach", "tempo", "aftercast"] },
        { key: "description.2", values: ["splash", "puddle"] },
        { key: "flood.on", values: ["splash", "recharge"], when: function (context) { return read(context.detail.values, ["flood"]) === true; } },
        { key: "flood.off", values: ["hold"], when: function (context) { return read(context.detail.values, ["flood"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
