/**
 * 月光 的伙伴 AI：它是一口靠夜色吃饭的回复，所以 AI 会在天色暗下来时才动用。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7）时排进恢复计划。
 * 等夜：ai.waitForSky（默认开）打开时只在暗处出手（context.facts.sunlight ≤ 0.2，通常就是夜晚），把这一口留给
 *   月色最足的时候；关闭后白天也照用，只拿保底回复。
 * 对谁出手：只有自己（kind self），reach 0，由共用任务直接施放。
 * 放完之后：生命补进来并冷却掉灼伤（若身上有），随后交回共用交战计划。
 */
namespace CompanionBehavior {
    const moonlightBelow = PokemonSkills.number("ai.healBelow", "回复阈值", 0.3, 0.9, 0.05);
    moonlightBelow.help = "自身生命低于该比例时才把月光排进恢复计划；调低更倾向硬撑，调高则一掉血就承月。";
    const moonlightSky = PokemonSkills.flag("ai.waitForSky", "等月色");
    moonlightSky.help = "开启：只在暗处（夜里）出手，白天把这招留着（那时回复少、也不冷却灼伤的月色）；关闭：受伤就照用，接受保底回复。";

    PokemonSkills.addPreferences("moonlight", { ai: { healBelow: 0.7, waitForSky: true } }, [moonlightBelow, moonlightSky]);

    registerUse("moonlight", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (ratio(source(context)) >= ai<number>(item, "healBelow", 0.7)) return false;
            if (!ai<boolean>(item, "waitForSky", true)) return true;
            var light = context.facts.sunlight;
            return typeof light !== "number" || light <= 0.2;
        },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
