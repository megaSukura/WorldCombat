/**
 * 治愈波动 / Heal Pulse —— 参数与数值来源。
 *
 * 原生事实：Psychic／变化／威力 —／命中 —／PP 10／target any；对选中的目标回复其最大 HP 的一半
 *   （Mega Launcher 特性改为 3/4）。flags 含 pulse：它是**发出去的波**。
 * 世界化：把「放出一圈治愈波动」翻成一件沿直线赶路的事——波动从施法者身上推出，沿瞄准线飞到伙伴身上才兑现，
 *   距离越远到得越晚；这也给了对手余地：在这一小段路上把残血伙伴带走，这一口就落空。
 *  目标选择按原生「any」只保留有意义的一半：**对另一个生物**（含对手）都成立，但疗效只有在友方身上有意义，
 *   所以 ready 只接受友方的另一个身体——自己不需要（那是羽栖／集沙／睡觉的事）。
 * 与同族分开：花疗是花瓣在伤者身上当场绽开、吃青草场地；治愈波动是一圈**赶路的波**，落在波前那个身体上，吃距离与时机。
 *
 * 数值来源（每项读不同的个体数据，展开成场上看得见的差异）：
 *   heal        回复比例：0.50 + 特攻偏移[−0.05,0.10] + 亲密度偏移[0,0.07]，超载档 ×1.12，夹 0.40..0.68。
 *   reach       施放距离：6 + 等级(≥20)偏移[0,2.4] + 特攻偏移[−0.8,1.6]，夹 4.5..11 格。
 *   pulseSpeed  波动速度：0.55 + 速度偏移[−0.12,0.35]，超载档 ×0.78，夹 0.30..1.10 格/刻——超载更厚但来得更慢。
 *   pulseRadius 波动半径：0.75 + 身高偏移[−0.2,0.7] + 特攻偏移[0,0.5]，夹 0.6..1.8 格；画面与判定同尺度。
 *   motes       波动光点：16 + 特攻 ÷ 6，夹 14..54 点，直接驱动粒子。
 *   charge      起手：9 刻 − 速度偏移[−2,3]，夹 5..14。
 *   settle      收招：8 刻 + 身高偏移[−1,2]，夹 5..13。
 * 配置 overcharge（超载）：回复 ×1.12，代价是波动速度 ×0.78（伙伴等得更久、更容易被抢在前面倒下）、冷却略长；
 *   关闭（轻吐）波跑得更快、冷却更短，适合急救。
 */
namespace PokemonSkills {
    export const healpulseId = "healpulse";

    actionParameters.define(healpulseId, {
        heal: percent(F.base(0.50)
            .plus(F.stat("specialAttack").minus(60).times(0.0006).clamp(-0.05, 0.10).as("波动厚度"))
            .plus(F.individual("friendship").minus(70).times(0.0004).clamp(0, 0.07).as("牵挂"))
            .times(F.when(F.pref("overcharge"), F.const(1.12), F.const(1)))
            .clamp(0.40, 0.68).round(3),
            "回复比例", "伙伴回复其最大生命的这个比例；特攻越高波动越厚、亲密度越高越贴心；超载档再多一层。"),
        reach: formula(F.base(6)
            .plus(F.level().minus(20).max(0).times(0.09).clamp(0, 2.4))
            .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.8, 1.6))
            .clamp(4.5, 11).round(2),
            "施放距离", { unit: " 格", description: "波动最远送到哪里；等级与特攻越高越远。" }),
        pulseSpeed: formula(F.base(0.55).plus(F.stat("speed").minus(40).times(0.004).clamp(-0.12, 0.35))
            .times(F.when(F.pref("overcharge"), F.const(0.78), F.const(1)))
            .clamp(0.30, 1.10).round(2),
            "波动速度", { unit: " 格/刻", description: "波动赶到伙伴身上的速度；速度快的个体赶得更急，超载档放慢换成更厚的一口。" }),
        pulseRadius: formula(F.base(0.75)
            .plus(F.body("height").minus(1.4).times(0.35))
            .plus(F.stat("specialAttack").minus(60).times(0.004).clamp(0, 0.5))
            .clamp(0.6, 1.8).round(2),
            "波动半径", { unit: " 格", description: "波动环的半径；身量与特攻越大越宽，画面与判定同尺度。" }),
        motes: formula(F.base(16).plus(F.stat("specialAttack").div(6)).clamp(14, 54).round(),
            "波动光点", { unit: " 点", description: "波动携带的光点数量；特攻越高越密，直接驱动粒子。" }),
        charge: seconds(F.base(9).minus(F.stat("speed").minus(40).times(0.05).clamp(-2, 3)).clamp(5, 14),
            "起手", "把波动拢起来送出去之前的准备；速度越快起得越利落。"),
        settle: seconds(F.base(8).plus(F.body("height").minus(1.4).times(0.4).clamp(-1, 2)).clamp(5, 13),
            "收招", "送出波动之后收势的时间；身板越大收得稍慢。")
    });

    stages(healpulseId, [
        { level: 40, values: { cooldown: 105 } },
        { level: 60, values: { cooldown: 88 } }
    ]);

    describe(healpulseId, [
        { key: "description.0", values: ["heal"] },
        { key: "description.1", values: ["reach", "pulseSpeed"] },
        { key: "description.2", values: ["charge", "settle"] },
        { key: "stance.overcharge", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) === true; } },
        { key: "stance.light", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
