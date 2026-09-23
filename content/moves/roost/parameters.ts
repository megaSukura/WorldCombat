/**
 * 羽栖 / Roost —— 参数与数值来源。
 *
 * 原生事实：Flying／变化／威力 —／命中 —／PP 5／target self；回复自己最大 HP 的一半，并在当回合失去飞行属性
 *   （`self: { volatileStatus: "roost" }`，onType 过滤掉 Flying）。
 * 世界化：把「降到地面、使身体休息」翻成一件有始有终的事——飞禽收翼**落到地面**，把回复分成几段在栖息窗口里
 *   慢慢交付；栖息期间它贴着地、失去飞行属性（地面招式与青草场地重新算得到它），这段窗口就是对手的余地：
 *   可以集火它、把它从安全位置推开，或用清除效果（牛奶／`/effect clear`）打断这段休息，只拿到已交付的部分。
 * 与同族分开：月光／光合作用是一口结算的环境回复，睡觉是不能行动的整段恢复；羽栖是**分段交付、落地可被打断**的一口。
 *
 * 数值来源（每项读不同的个体数据，展开成场上看得见的差异）：
 *   heal       回复总量：0.44 + 亲密度偏移[−0.04,0.08]，深栖档 +0.06，夹 0.36..0.62。
 *   restTicks  栖息窗口：58 刻 − 速度(≥40)偏移[0,12]，深栖档 ×1.5，夹 36..110。
 *   chunks     交付段数：4 + 等级(≥20)偏移[0,3]，夹 3..6。
 *   feathers   落地羽尘数：16 + 身高(≥1.4)偏移[0,14]，夹 14..54，直接驱动粒子数量。
 *   downdraft  下压气流强度：10 + 体重(≥30)偏移[0,8]，夹 8..34。
 *   foldWidth  羽风范围：1.0 + 身高偏移[−0.2,0.6]，夹 0.8..2.0，也是落地判定的参考半径。
 *   gather     起手：12 刻 − 速度偏移[0,6]，夹 7..16。
 *   settle     收招：10 刻 + 体重偏移[0,4]，夹 6..14。
 * 配置 deep（深栖）：回复总量 +0.06、栖息窗口 ×1.5，代价是冷却 +14 刻、且落地的脆弱窗口更长；
 *   关闭（浅栖）更快收势、冷却更短，适合在受击间隙里补一口。
 */
namespace PokemonSkills {
    export const roostId = "roost";

    actionParameters.define(roostId, {
        heal: percent(F.base(0.44)
            .plus(F.individual("friendship").minus(70).times(0.0005).clamp(-0.04, 0.08).as("眷巢"))
            .plus(F.when(F.pref("deep"), F.const(0.06), F.const(0)))
            .clamp(0.36, 0.62).round(3),
            "回复比例", "整段栖息回复的最大生命比例；亲密度越高歇得越踏实，深栖档再多补一成。"),
        restTicks: seconds(F.base(58)
            .minus(F.stat("speed").minus(40).max(0).times(0.25).clamp(0, 12))
            .times(F.when(F.pref("deep"), F.const(1.5), F.const(1)))
            .clamp(36, 110),
            "栖息时长", "落地后要歇多久才把回复付完；速度越快收得越快，深栖档把窗口拉长。"),
        chunks: formula(F.base(4).plus(F.level().minus(20).max(0).times(0.03)).clamp(3, 6).round(),
            "交付段数", { unit: " 段", description: "把回复分成几段逐次交付；等级越高交得越匀。" }),
        feathers: formula(F.base(16).plus(F.body("height").minus(1.4).max(0).times(14)).clamp(14, 54).round(),
            "羽毛数量", { unit: " 点", description: "落地时扬起的羽尘数量；翼展越宽越多，直接驱动粒子。" }),
        downdraft: formula(F.base(10).plus(F.body("weight").minus(30).max(0).times(0.08)).clamp(8, 34).round(),
            "下压气流", { unit: " 点", description: "起手时脚边下压的气流强度；体重越大压得越明显。" }),
        foldWidth: formula(F.base(1.0).plus(F.body("height").minus(1.4).times(0.4)).clamp(0.8, 2.0).round(2),
            "羽风范围", { unit: " 格", description: "落地羽尘与气流铺开的半径，也是这次落地的参考尺度。" }),
        gather: seconds(F.base(12).minus(F.stat("speed").minus(40).max(0).times(0.06)).clamp(7, 16),
            "起手", "收翼下沉之前的准备时间；速度越快落得越快。"),
        settle: seconds(F.base(10).plus(F.body("weight").minus(30).max(0).times(0.03)).clamp(6, 14),
            "收招", "栖息结束起身收势的时间；身板越重起身越慢。")
    });

    stages(roostId, [
        { level: 40, values: { cooldown: 190 } },
        { level: 60, values: { cooldown: 160 } }
    ]);

    describe(roostId, [
        { key: "description.0", values: ["heal","restTicks"] },
        { key: "description.1", values: ["chunks"] },
        { key: "description.2", values: ["gather", "settle"] },
        { key: "stance.deep", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "stance.shallow", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
