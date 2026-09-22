/**
 * 胃液 / gastroacid — 参数与机制数值来源。
 *
 * 核心念头：朝对手吐一口酸，酸液沾上身体后把它的特性从身上洗掉一段时间。是对“扮演/描绘”的减法：
 *   同族把对手的本质借过来，胃液把对手的本质蚀掉。
 * 原生：Poison／变化／命中 100／PP 10／单体；`volatileStatus: gastroacid`，`onTryHit` 在目标特性带
 *   cantsuppress 或持有效果护盾时失败；命中后该特性效果被忽略。即时化把“忽略特性”实现成共享的
 *   `NativeModifiers` suppressAbility 层（与木乃伊同一套临时压制机制），并给任何生物挂上共享身份
 *   `world_combat:status/gastroacid` 的“沾酸”状态，供别的作者消费。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach     射程：体型给出吐得到多远，速度决定酸液还能带走多远。
 *   velocity  弹速：速度与体重共同决定酸弹飞得多快。
 *   radius    碰撞半径：体型决定酸弹的粗细。
 *   tempo     起手：速度决定胃里涌起酸液多快。
 *   aftercast 收势：特防决定吐完站得多稳。
 *   hold      蚀刻时长：等级与特攻决定酸液的效力，浓酸再延长。
 *   recharge  冷却：速度决定多久能再吐一口。
 *   drops     酸滴数：特攻决定命中溅开的酸滴。
 *   bubbles   酸泡数：等级决定起手喉间滚动的气泡。
 *   puddle    地面酸渍：体重决定落地那一滩留多久。
 * 配置项 thick（浓酸 / 稀酸）：浓酸更久、冷却更长；稀酸更短、更便宜。
 */

namespace PokemonSkills {
    actionParameters.define("gastroacid", {
        reach: formula(
            F.base(9, "基础")
                .plus(F.body("height").minus(1.4).times(1.2).as("体型"))
                .plus(F.stat("speed").minus(40).div(25).clamp(-1, 3).as("速度"))
                .clamp(6, 17).round(1),
            "射程", { unit: "格", description: "酸液能吐到多远；个头越高吐得越远，速度快的个体还能多带一段。它也是本招实际射程的来源。" }),
        velocity: formula(
            F.base(0.55, "基础")
                .plus(F.stat("speed").div(3000).as("速度"))
                .plus(F.body("weight").div(60000).as("体重"))
                .clamp(0.4, 1.1).round(2),
            "弹速", { unit: "格/刻", description: "酸弹飞行的速度；速度与体重越大，吐出的酸弹越快。" }),
        radius: formula(
            F.base(0.3, "基础").plus(F.body("height").minus(1.4).times(0.14).as("体型")).clamp(0.2, 0.55).round(2),
            "碰撞半径", { unit: "格", description: "酸弹的粗细；个头越大吐出的酸团越大。" }),
        tempo: seconds(
            F.base(10, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 6).as("速度")).clamp(5, 13).round(),
            "起手", "胃里涌起酸液所需时间；速度越快的个体涌得越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(45).clamp(-1.2, 2.5).as("特防")).clamp(5, 12).round(),
            "收势", "吐完后的收势；特防越高压得越稳。"),
        hold: seconds(
            F.base(120, "基础")
                .plus(F.level().times(2.6).as("等级"))
                .plus(F.stat("specialAttack").div(4).as("特攻"))
                .times(F.when(F.pref("thick"), F.const(1.6), F.const(0.55)).as("酸液浓度"))
                .clamp(50, 900).round(),
            "蚀刻时长", "特性被酸液压制多久；等级与特攻越高、浓酸越久。"),
        recharge: seconds(
            F.base(80, "基础").minus(F.stat("speed").times(0.28).as("速度")).clamp(36, 120).round(),
            "冷却", "再吐一口酸需要多久；速度快的个体更快恢复。"),
        drops: formula(
            F.base(12, "基础").plus(F.stat("specialAttack").div(6).as("特攻")).clamp(12, 40).round(),
            "酸滴数", { unit: "滴", description: "命中处溅开的酸滴数量；特攻越高越密。" }),
        bubbles: formula(
            F.base(6, "基础").plus(F.level().div(4).as("等级")).clamp(6, 22).round(),
            "酸泡数", { unit: "个", description: "起手喉间滚动的酸泡数量；等级越高越多。" }),
        puddle: seconds(
            F.base(60, "基础").plus(F.body("weight").div(4000).as("体重")).clamp(40, 200).round(),
            "酸渍维持", "酸液落地后那一小滩酸渍留多久；体重越大留得越久。它是可以被绕开的真方块。")
    });

    stages("gastroacid", [{ level: 35, values: { cooldown: 70 } }, { level: 50, values: { cooldown: 60 } }]);

    describe("gastroacid", [
        { key: "description.0", values: ["reach", "tempo", "velocity"] },
        { key: "description.1", values: ["hold"] },
        { key: "description.2", values: ["drops", "bubbles", "puddle"] },
        { key: "thick.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.thick); } },
        { key: "thick.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.thick); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
