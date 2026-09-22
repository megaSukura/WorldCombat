/**
 * 烦恼种子 / worryseed — 参数与机制数值来源。
 *
 * 核心念头：把一颗会生根的种子投进对手身体，它在那里发芽，把对手的特性顶成「不眠」，
 *   从此睡不下去。种子是真东西：命中处的地面会被它顶出一小块苔。
 * 原生：Grass／变化／命中 100／PP 10／单体；`onTryImmunity` 对 truant／insomnia 直接免疫，
 *   `onTryHit` 在目标特性带 cantsuppress 时失败；命中后把特性置为 insomnia，若正在睡眠则治愈。
 * 即时化把这层身份写成共享 NativeModifiers ability 层（到期自动还原原生特性），
 *   并挂一个共享身份 `world_combat:status/worryseed` 的标记；不眠由 rules.ts 的共享
 *   CombatStatus.gate 承担——凡有效特性是 insomnia 的战斗者都不能入睡，谁施加的都一样。
 *
 * 每个参数是一棵公式，依赖分散在不同精灵数据上：
 *   reach     投种距离：个头与速度决定种子能扔多远。它也是本招实际射程的来源。
 *   velocity  种速：速度与体重共同决定种子飞得多快。
 *   radius    种子半径：体型决定种子的粗细，也决定撞上后的判定范围。
 *   tempo     起手：速度决定种子在手里鼓起来多快。
 *   aftercast 收势：特防决定投完站得多稳。
 *   hold      烦恼时长：等级与特攻决定种子生根的效力，深植再延长。
 *   recharge  冷却：速度决定多久能再种一颗。
 *   seeds     种子数：特攻决定投掷时围绕手臂转的种子数量。
 *   worries   心绪数：等级决定命中处冒出的「？」数量。
 *   roots     扎根数：特攻与体重决定破土而出的根须数量。
 *   patch     苔痕维持：体重决定被顶出的那一小块苔留多久。
 * 配置项 deep（深植／浅植）：深植更久、冷却更长；浅植更短、更便宜。时长与出手频率互相取舍。
 */

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
        patch: seconds(
            F.base(80, "基础").plus(F.body("weight").div(2500).as("体重")).clamp(60, 240).round(),
            "苔痕维持", "命中处被顶出的那一小块苔留多久；体重越大根扎得越深、留得越久。它是一格真方块。")
    });

    stages("worryseed", [{ level: 35, values: { cooldown: 60 } }, { level: 50, values: { cooldown: 50 } }]);

    describe("worryseed", [
        { key: "description.0", values: ["reach", "tempo", "velocity"] },
        { key: "description.1", values: ["hold"] },
        { key: "description.2", values: ["seeds", "worries", "patch"] },
        { key: "deep.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.deep); } },
        { key: "deep.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.deep); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
