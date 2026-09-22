/** 烦恼种子：投射种子，将目标特性暂时替换为不眠并唤醒睡眠目标。 个体差异、配置和现场事实由以下公式定义。 */

namespace PokemonSkills {
    actionParameters.define("worryseed", {
        reach: formula(
            F.base(7, "基础")
                .plus(F.body("height").minus(1.4).times(1.1).as("体型"))
                .plus(F.stat("speed").minus(40).div(30).clamp(-0.8, 2.2).as("速度"))
                .clamp(5, 14).round(1),
            "投种距离", { unit: "格", description: "种子能扔到多远；个头越高、速度越快扔得越远。它也是本招实际射程的来源。" }),
        velocity: formula(
            F.base(0.6, "基础")
                .plus(F.stat("speed").div(3400).as("速度"))
                .plus(F.body("weight").div(70000).as("体重"))
                .clamp(0.45, 1.05).round(2),
            "种速", { unit: "格/刻", description: "种子飞行的速度；速度与体重越大，脱手越快。" }),
        radius: formula(
            F.base(0.22, "基础").plus(F.body("height").minus(1.4).times(0.1).as("体型")).clamp(0.15, 0.4).round(2),
            "种子半径", { unit: "格", description: "这颗种子的粗细；个头越大越饱满，撞上后的判定也越宽。" }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 5).as("速度")).clamp(4, 12).round(),
            "投种起手", "种子在手里鼓起来所需时间；速度越快鼓得越快。"),
        aftercast: seconds(
            F.base(6, "基础").plus(F.stat("specialDefence").minus(50).div(50).clamp(-1, 2).as("特防")).clamp(4, 10).round(),
            "收势", "投完后的收势；特防越高压得越稳。"),
        hold: seconds(
            F.base(160, "基础")
                .plus(F.level().times(3.4).as("等级"))
                .plus(F.stat("specialAttack").div(4.5).as("特攻"))
                .times(F.when(F.pref("deep").as("深植"), F.const(1.7), F.const(0.6)).as("种植深浅"))
                .clamp(80, 1400).round(),
            "烦恼时长", "种子把特性顶成不眠并压制睡着多久；等级与特攻越高、深植越久。"),
        recharge: seconds(
            F.base(70, "基础").minus(F.stat("speed").times(0.26).as("速度")).clamp(34, 110).round(),
            "再种冷却", "再种一颗种子需要多久；速度快的个体更快恢复。"),
        seeds: formula(
            F.base(10, "基础").plus(F.stat("specialAttack").div(7).as("特攻")).clamp(10, 36).round(),
            "种子数", { unit: "颗", description: "起手时绕着施法者转的种子数量；特攻越高越密。" }),
        worries: formula(
            F.base(4, "基础").plus(F.level().div(6).as("等级")).clamp(4, 16).round(),
            "心绪数", { unit: "个", description: "命中处从目标身上冒出的「？」数量；等级越高越多。" }),
        roots: formula(
            F.base(6, "基础").plus(F.stat("specialAttack").div(9).as("特攻")).plus(F.body("weight").div(8000).as("体重")).clamp(6, 24).round(),
            "扎根数", { unit: "条", description: "种子破土时顶出的根须数量；特攻与体重越大越多。" }),
    });

    stages("worryseed", [{ level: 35, values: { cooldown: 60 } }, { level: 50, values: { cooldown: 50 } }]);

    describe("worryseed", [
        { key: "description.0", values: ["reach", "tempo", "velocity"] },
        { key: "description.1", values: ["hold"] },
        { key: "description.2", values: ["seeds", "worries"] },
        { key: "deep.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.deep); } },
        { key: "deep.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.deep); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
