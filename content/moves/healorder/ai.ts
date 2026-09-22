/**
 * 回复指令 的伙伴 AI：这是快捷、可被打断的自我疗伤，适合在掉血后立即动用。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.75），且还没到满血。
 * 对谁出手：只有自己（kind self），reach 0；治疗由手下在引导结束后交回。
 * 优先级：0，落在共用顺序的恢复环节；生命见底时交给保命与撤退，随后仍会找机会重新召唤。
 * 配置：elite 布尔切换精锐手下——更少但更耐打，单个阵亡损失更大。
 */
namespace CompanionBehavior {
    const healorderBelow = PokemonSkills.number("ai.healBelow", "疗伤阈值", 0.3, 0.9, 0.05);
    healorderBelow.help = "自身生命低于该比例就召唤手下疗伤；调低更倾向硬撑，调高则一掉血就召唤。";

    PokemonSkills.addPreferences("healorder", { elite: false, helpFriends: false, ai: { healBelow: 0.75 } }, [healorderBelow]);

    registerUse("healorder", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) { return ratio(source(context)) < ai<number>(item, "healBelow", 0.75); },
        accepts: function (context, item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
