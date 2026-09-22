/**
 * 喝牛奶 的伙伴 AI：它除了补血以外还能冲掉中毒，所以即使血线还高、只要中毒就值得动用。
 *
 * 何时考虑：自身生命低于 ai.healBelow（默认 0.7），或者身上带着共享身份 world_combat:status/poison（任一来源的中毒）。
 * 对谁出手：只有自己（kind self），reach 0；由共用恢复任务直接施放。
 * 优先级：中毒时给 2（略高于普通恢复候选），提示共用顺序优先把这一口用来解毒；其余时候 0。
 * 配置：warm 布尔切换温奶——回复更多、口间隔更长，代价是冷却更久；关闭冷饮则喝得急、补得少、冷却短。
 */
namespace CompanionBehavior {
    const milkdrinkBelow = PokemonSkills.number("ai.healBelow", "饮用阈值", 0.3, 0.9, 0.05);
    milkdrinkBelow.help = "自身生命低于该比例就喝一口；调低更倾向硬撑，调高则一掉血就喝。";
    const milkdrinkWarm = PokemonSkills.flag("warm", "温奶");
    milkdrinkWarm.help = "开启温奶：回复总量 +0.05、口间隔 ×1.3（喝得慢），代价是冷却更久；关闭冷饮：回复 −0.03、口间隔 ×0.8、冷却更短。";

    PokemonSkills.addPreferences("milkdrink", { warm: false, ai: { healBelow: 0.7 } }, [milkdrinkBelow, milkdrinkWarm]);

    registerUse("milkdrink", {
        protocols: ["world_combat:heal"],
        reach: function () { return 0; },
        ready: function () { return true; },
        priority: function (context) { return CompanionBehavior.status(context, source(context), "poison") ? 2 : 0; },
        available: function (context, item) {
            if (context.facts.mounted) return false;
            var self = source(context);
            return ratio(self) < ai<number>(item, "healBelow", 0.7) || CompanionBehavior.status(context, self, "poison");
        },
        accepts: function (context, _item, target) { return String(target.ref) === String(source(context).ref); }
    });
}
