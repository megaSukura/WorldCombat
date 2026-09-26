/**
 * 喝牛奶 / Milk Drink —— 参数与数值来源。
 *
 * 原生事实：Normal／变化／威力 —／命中 —／PP 5／target self；heal: [1,2] —— 回复自己最大 HP 的一半。
 *
 * 世界化：把「喝牛奶」当成字面意思——仰头连饮几大口，温热的牛奶把伤补上，最后一口**把身上的中毒也冲掉**。
 *   节拍就是这招的形状：几口之间各结算一段回复，玩家能看到它一口口地喝；奶量来自它自己的身板（体重）与滋养
 *   （特攻）。解毒是**完成奖励**：只有把最后一口真正喝完才会触发；中途主动取消或被打断只保留已喝部分、不提前解毒。
 *   即使满血，只要中毒它仍值得动用——把回复口数当节拍走完，最后一口冲毒。
 * 与同族分开：自我再生按刻连续、可在攻击中随时掐断；偷懒留下减速、生蛋外化为蛋；喝牛奶是**要喝完才有的节拍连饮外加清毒**。
 *
 * 数值来源（每项读不同的个体数据，展开成场上看得见的差异）：
 *   heal       回复比例：0.40 + 特攻(≥60)偏移[0,0.08] + 体重(≥30)偏移[0,0.05]，温奶档 +0.05／冷饮档 −0.03，夹 0.32..0.62。
 *   gulps      口数：3 + 等级(≥20)偏移[0,2]，夹 3..5 口。
 *   gulpTicks  口间隔：9 − 速度(≥40)偏移[0,3]，温奶档 ×1.3、冷饮档 ×0.8，夹 5..14 刻。
 *   drops      奶滴数量：16 + 体重(≥30)偏移[0,26]，夹 12..48 点，直接驱动粒子数量。
 *   cleanRadius 冲毒光晕：0.8 + 身高偏移[−0.15,0.6]，夹 0.65..1.7 格。
 *   open       起手：8 − 速度(≥40)偏移[0,3]，夹 5..10 刻。
 *   wipe       收招：10 − 速度偏移[0,3]，夹 6..12 刻。
 * 配置 warm（温奶）：回复 +0.05、口间隔 ×1.3（喝得慢、窗口长），代价是冷却 ×1.08；
 *   关闭（冷饮）回复 −0.03、口间隔 ×0.8、冷却 ×0.94，更快更省但补得少。
 */
namespace PokemonSkills {
    export const milkdrinkId = "milkdrink";

    actionParameters.define(milkdrinkId, {
        heal: percent(F.base(0.40)
            .plus(F.stat("specialAttack").minus(60).max(0).times(0.001).clamp(0, 0.08).as("滋养"))
            .plus(F.body("weight").minus(30).max(0).times(0.05).clamp(0, 0.05).as("奶量"))
            .plus(F.when(F.pref("warm"), F.const(0.05), F.const(-0.03)))
            .clamp(0.32, 0.62).round(3),
            "回复比例", "整段连饮回复的最大生命比例；特攻越高滋养越足、体重越大奶量越多，温奶档再多补一点。"),
        gulps: formula(F.base(3).plus(F.level().minus(20).max(0).times(0.05)).clamp(3, 5).round(),
            "口数", { unit: " 口", description: "把这次回复分成几口喝下；等级越高分得越多，节拍越清楚。" }),
        gulpTicks: seconds(F.base(9)
            .minus(F.stat("speed").minus(40).max(0).times(0.06))
            .times(F.when(F.pref("warm"), F.const(1.3), F.const(0.8)))
            .clamp(5, 14),
            "口间隔", "两口之间的时间；速度越快喝得越急，温奶档放慢、冷饮档更快。"),
        drops: formula(F.base(16).plus(F.body("weight").minus(30).max(0).times(0.4)).clamp(12, 48).round(),
            "奶滴数量", { unit: " 点", description: "每口溅起的乳白奶滴数量；体重越大越多，直接驱动粒子。" }),
        cleanRadius: formula(F.base(0.8).plus(F.body("height").minus(1.4).times(0.4)).clamp(0.65, 1.7).round(2),
            "冲毒光晕", { unit: " 格", description: "最后一口把毒冲散时清亮水光扫过的半径；身量越大范围越广。" }),
        open: seconds(F.base(8).minus(F.stat("speed").minus(40).max(0).times(0.05)).clamp(5, 10),
            "起手", "举瓶的准备时间；速度越快越短。"),
        wipe: seconds(F.base(10).minus(F.stat("speed").minus(40).max(0).times(0.06)).clamp(6, 12),
            "收招", "饮完抹嘴收势的时间；速度越快收得越快。")
    });

    stages(milkdrinkId, [
        { level: 40, values: { cooldown: 180 } },
        { level: 60, values: { cooldown: 155 } }
    ]);

    describe(milkdrinkId, [
        { key: "description.0", values: ["heal", "gulps", "gulpTicks"] },
        { key: "description.1", values: [] },
        { key: "description.2", values: ["open", "wipe"] },
        { key: "stance.warm", values: [], when: function (context) { return read(context.detail.values, ["warm"]) === true; } },
        { key: "stance.cold", values: [], when: function (context) { return read(context.detail.values, ["warm"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
