/**
 * 自我再生 的伙伴 AI：这是不锁足、按刻交付的持续自救，适合在边走边打、需要缓慢回一口气时动用。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7）且还没到满血。
 * 对谁出手：只有自己（kind self），reach 0；由共用恢复任务直接施放，窗口里它仍可走位。
 * 优先级：0，落在共用顺序的恢复环节；生命见底时交给保命与撤退，随后仍会找机会重新再生。
 * 配置：steady 布尔切换稳态——回复更多、窗口更长，代价是冷却更久、暴露更久。
 */
namespace CompanionBehavior {
    const recoverBelow = PokemonSkills.number("ai.healBelow", "再生阈值", 0.3, 0.9, 0.05);
    recoverBelow.help = "自身生命低于该比例就启动再生；调低更倾向硬撑，调高则一掉血就开始再生。";
    const recoverSteady = PokemonSkills.flag("steady", "稳态再生");
    recoverSteady.help = "开启稳态：回复总量 +0.05、再生窗口 ×1.35（每刻更慢），代价是冷却更久；关闭速生：回复略少、窗口 ×0.75、冷却更短。";

    PokemonSkills.addPreferences("recover", { steady: false, ai: { healBelow: 0.7 } }, [recoverBelow, recoverSteady]);

    registerUse("recover", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            return ratio(source(context)) < ai<number>(item, "healBelow", 0.7);
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
