/** 胃液：酸弹命中后压制目标特性；酸液飞行、溅射和沾酸由现有表现承载。 个体差异、配置和现场事实由以下公式定义。 */

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
    });

    stages("gastroacid", [{ level: 35, values: { cooldown: 70 } }, { level: 50, values: { cooldown: 60 } }]);

    describe("gastroacid", [
        { key: "description.0", values: ["reach", "tempo", "velocity"] },
        { key: "description.1", values: ["hold"] },
        { key: "description.2", values: ["drops", "bubbles"] },
        { key: "thick.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.thick); } },
        { key: "thick.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.thick); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
