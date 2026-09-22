/**
 * 光合作用 的伙伴 AI：这是依赖光照的自我回复，所以它除了看血量，还看头顶那片光。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7）时才排进恢复计划。
 * 光照条件：所在点的日照低于 ai.minimumLight（默认 0.2）时不浪费这一轮——树荫、夜里、室内都先不动用；
 *   对手阳光下的个体来说，站在亮处回一口才值。
 * 对谁出手：只有自己（kind self），reach 0，由共用任务直接施放。
 * 放完之后：生命补进来，继续共用交战计划；这招冷却较长，不重复施放。
 */
namespace CompanionBehavior {
    const synthesisBelow = PokemonSkills.number("ai.healBelow", "回复阈值", 0.3, 0.9, 0.05);
    synthesisBelow.help = "自身生命低于该比例时才把光合作用排进恢复计划；调低更倾向硬撑，调高则一掉血就摊叶。";
    const synthesisLight = PokemonSkills.number("ai.minimumLight", "最低日照", 0, 1, 0.05);
    synthesisLight.help = "所在点日照低于该值就不施放，等走到更亮的地方；调低会在树荫里也回一口，调高只在正午的强光下才动用。";

    PokemonSkills.addPreferences("synthesis", { ai: { healBelow: 0.7, minimumLight: 0.2 } }, [synthesisBelow, synthesisLight]);

    registerUse("synthesis", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (ratio(source(context)) >= ai<number>(item, "healBelow", 0.7)) return false;
            var light = context.facts.sunlight;
            return typeof light !== "number" || light >= ai<number>(item, "minimumLight", 0.2);
        },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
