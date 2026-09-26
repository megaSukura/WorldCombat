/**
 * 晨光 的伙伴 AI：它是一口靠天吃饭的回复，所以 AI 会看头顶有没有晨光。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7）时排进恢复计划。
 * 等天：ai.waitForSky（默认开）打开时只在「晨光可及」时出手——执行、说明与 AI 共用同一个
 *   morningsunDawnAt 真事实（白天 × 可见天空 × 无雨，或共享语义的烈日），所以人工烈日也被正确识别，
 *   漆黑的洞穴不会被误读成晨光。关闭后受伤就照用，接受保底回复。
 * 危急：等待中若生命已跌到回复阈值一半以下，先取保底回复，不为等最强晨光而错过窗口。
 * 对谁出手：只有自己（kind self），reach 0，由共用任务直接施放。
 */
namespace CompanionBehavior {
    const morningsunBelow = PokemonSkills.number("ai.healBelow", "回复阈值", 0.3, 0.9, 0.05);
    morningsunBelow.help = "自身生命低于该比例时才把晨光排进恢复计划；调低更倾向硬撑，调高则一掉血就迎候晨光。";
    const morningsunSky = PokemonSkills.flag("ai.waitForSky", "等晨光");
    morningsunSky.help = "开启：只在晨光可及（白天晴空或共享烈日）时出手，夜里与阴雨把这招留着（那时回复少、也没有加速）；关闭：受伤就照用，接受保底回复。";

    PokemonSkills.addPreferences("morningsun", { ai: { healBelow: 0.7, waitForSky: true } }, [morningsunBelow, morningsunSky]);

    registerUse("morningsun", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            var below = ai<number>(item, "healBelow", 0.7), health = ratio(source(context));
            if (health >= below) return false;
            if (!ai<boolean>(item, "waitForSky", true)) return true;
            if (PokemonSkills.morningsunDawnAt(world(context), point(source(context).point))) return true;
            // 危急时接受低光保底，避免为等最强晨光而耽误自救。
            return health < below * 0.5;
        },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
