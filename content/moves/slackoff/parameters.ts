/**
 * 偷懒 / Slack Off —— 参数与数值来源。
 *
 * 原生事实：Normal／变化／威力 —／命中 —／PP 5／target self；heal: [1,2] —— 回复自己最大 HP 的一半。
 *
 * 世界化：把「偷懒休息」落成**最快的一口**：几乎不用准备、就地一摊把生命补一大截，但懒意会粘在身上——
 *   随后挂上一段「倦怠」：移动速度下降，拖着步子走。这一口换的是接下来的机动力，所以它最适合在
 *   对手暂时够不到、或你已经不打算再追的时候动用；开了酣睡档补得更多，代价是倦怠更久。
 * 与同族分开：自我再生是按刻连续、不锁足；偷懒是一锤子买卖，代价留在身上（移动变慢）。
 *
 * 数值来源（每项读不同的个体数据，展开成场上看得见的差异）：
 *   heal       回复比例：0.42 + 防御(≥60)偏移[0,0.06] + 体重(≥30)偏移[0,0.05]，酣睡档 +0.06，夹 0.34..0.66。
 *   loafTicks  倦怠时长：70 + 体重(≥30)偏移[0,50]，酣睡档 ×1.4，夹 50..160 刻。
 *   dust       瘫坐尘数：18 + 体重(≥30)偏移[0,26]，夹 14..50 点，直接驱动粒子数量。
 *   snoreRate  鼾泡密度：6 + 体重(≥30)偏移[0,8]，夹 5..16，驱动倦怠期间的气泡数量。
 *   slouch     瘫坐起手：6 − 速度(≥40)偏移[0,2]，夹 4..8 刻（比同族都快）。
 *   stretch    起身收招：12 − 速度(≥40)偏移[0,4]，夹 8..16 刻。
 * 配置 deep（酣睡）：回复 +0.06、倦怠时长 ×1.4，代价是更长的机动空窗；关闭（打盹）补得少一点、几息就缓过来。
 */
namespace PokemonSkills {
    export const slackoffId = "slackoff";

    actionParameters.define(slackoffId, {
        heal: percent(F.base(0.42)
            .plus(F.stat("defence").minus(60).max(0).times(0.001).clamp(0, 0.06).as("厚皮"))
            .plus(F.body("weight").minus(30).max(0).times(0.05).clamp(0, 0.05).as("身板"))
            .plus(F.when(F.pref("deep"), F.const(0.06), F.const(0)))
            .clamp(0.34, 0.66).round(3),
            "回复比例", "就地一摊回复的最大生命比例；皮越厚、身板越沉补得越足，酣睡档再多补一点。"),
        loafTicks: seconds(F.base(70)
            .plus(F.body("weight").minus(30).max(0).times(0.5))
            .times(F.when(F.pref("deep"), F.const(1.4), F.const(1)))
            .clamp(50, 160),
            "倦怠时长", "回复之后移动变慢的持续时间；身板越沉拖得越久，酣睡档再拉长。"),
        dust: formula(F.base(18).plus(F.body("weight").minus(30).max(0).times(0.4)).clamp(14, 50).round(),
            "瘫坐尘数", { unit: " 点", description: "摊下去时扬起的尘土数量；体重越大越多，直接驱动粒子。" }),
        snoreRate: formula(F.base(6).plus(F.body("weight").minus(30).max(0).times(0.2)).clamp(5, 16).round(),
            "鼾泡密度", { unit: " 点", description: "倦怠期间飘起的睡意气泡密度；身板越沉越明显。" }),
        slouch: seconds(F.base(6).minus(F.stat("speed").minus(40).max(0).times(0.05)).clamp(4, 8),
            "瘫坐起手", "就地摊下的准备时间；这是同族里最短的起手，速度越快越利落。"),
        stretch: seconds(F.base(12).minus(F.stat("speed").minus(40).max(0).times(0.1)).clamp(8, 16),
            "起身收招", "补完起身收势的时间；速度越快起得越快。")
    });

    stages(slackoffId, [
        { level: 40, values: { cooldown: 190 } },
        { level: 60, values: { cooldown: 165 } }
    ]);

    describe(slackoffId, [
        { key: "description.0", values: ["heal","loafTicks"] },
        { key: "description.2", values: ["slouch", "stretch"] },
        { key: "stance.deep", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "stance.doze", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
