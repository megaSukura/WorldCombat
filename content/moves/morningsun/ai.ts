/**
 * 晨光 的伙伴 AI：它是一口靠天吃饭的回复，所以 AI 会看头顶有没有晨光。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7）时排进恢复计划。
 * 等天：ai.waitForSky（默认开）打开时只在强日光（context.facts.sunlight ≥ 0.8，通常就是白天晴空）下出手，
 *   把这一口留给真正接得住的时候；关闭后夜里与阴雨也照用，只拿保底回复。
 * 对谁出手：只有自己（kind self），reach 0，由共用任务直接施放。
 * 放完之后：生命补进来并带上速度提升（接住晨光时），随后交回共用交战计划。
 */
namespace CompanionBehavior {
    const morningsunBelow = PokemonSkills.number("ai.healBelow", "回复阈值", 0.3, 0.9, 0.05);
    morningsunBelow.help = "自身生命低于该比例时才把晨光排进恢复计划；调低更倾向硬撑，调高则一掉血就迎候晨光。";
    const morningsunSky = PokemonSkills.flag("ai.waitForSky", "等晨光");
    morningsunSky.help = "开启：只在强日光下出手，夜里与阴雨把这招留着（那时回复少、也没有加速）；关闭：受伤就照用，接受保底回复。";

    PokemonSkills.addPreferences("morningsun", { ai: { healBelow: 0.7, waitForSky: true } }, [morningsunBelow, morningsunSky]);

    registerUse("morningsun", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (ratio(source(context)) >= ai<number>(item, "healBelow", 0.7)) return false;
            if (!ai<boolean>(item, "waitForSky", true)) return true;
            var light = context.facts.sunlight;
            return typeof light !== "number" || light >= 0.8;
        },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
