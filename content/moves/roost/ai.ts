/**
 * 羽栖 的伙伴 AI：这是落地分段的一口自救，适合在掉血后、或需要主动贴地时动用。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.65）且还没到满血。
 * 对谁出手：只有自己（kind self），reach 0；由共用恢复任务直接施放。
 * 优先级：0，落在共用顺序的恢复环节；生命见底时交给保命与撤退，随后仍会找机会落地歇一口。
 * 配置：deep 布尔切换深栖——回复更多、窗口更长，代价是冷却更久、落地脆弱期更久。
 */
namespace CompanionBehavior {
    const roostBelow = PokemonSkills.number("ai.healBelow", "落地阈值", 0.3, 0.9, 0.05);
    roostBelow.help = "自身生命低于该比例就落地栖息；调低更倾向硬撑，调高则一掉血就落。";
    const roostDeep = PokemonSkills.flag("deep", "深栖");
    roostDeep.help = "开启后回复总量略增、栖息窗口 ×1.5，但冷却更久、落地脆弱期更长；关闭则更快收势、更省。";

    PokemonSkills.addPreferences("roost", { deep: false, ai: { healBelow: 0.65 } }, [roostBelow, roostDeep]);

    registerUse("roost", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            return ratio(source(context)) < ai<number>(item, "healBelow", 0.65);
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
