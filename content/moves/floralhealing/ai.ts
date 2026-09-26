/**
 * 花疗 的伙伴 AI：这是一口当场分两朵绽开的近距离救助，只送给别人；它比治愈波动够得近、第一口立刻兑现。
 *
 * 何时考虑：共享的「伤者」感官挑出一个生命低于 ai.healBelow（默认 0.7）的友方，且它在 ai.maxChase（默认 10）以内。
 * 对谁出手：那个受伤的伙伴；不接受自己、也不接受敌人。
 * 候选之间怎么排：生命低于 0.4 的急危者抬到 100 以上；濒死（低于 0.25）再多加一档，让「立刻兑现的第一朵」
 *   抢在需要赶路的治愈波动之前；站在青草场地上者加权，因为第二朵会开得更足。
 * 放完之后：伙伴拿到两朵花，交回共享顺序继续战斗。
 * 配置：bouquet 切换繁花／省花；ai.healBelow 与 ai.maxChase 调救助阈值与愿意跑多远撒花。
 */
namespace CompanionBehavior {
    const floralBelow = PokemonSkills.number("ai.healBelow", "花疗阈值", 0.3, 0.95, 0.05);
    floralBelow.help = "伙伴生命低于该比例才把花疗排进救助计划；调低更倾向继续输出，调高一有人掉血就去救。";
    const floralChase = PokemonSkills.number("ai.maxChase", "撒花距离", 3, 20, 1);
    floralChase.help = "伙伴离自己这个距离以内才考虑撒花；调小只在身边时救，调大愿意靠过去。";

    PokemonSkills.addPreferences("floralhealing", { bouquet: false, helpFriends: true, ai: { healBelow: 0.7, maxChase: 10 } }, [floralBelow, floralChase]);

    registerUse("floralhealing", {
        protocols: ["world_combat:heal"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            const self = source(context);
            if (String(target.ref) === String(self.ref) || !target.friendly || target.health <= 0) return false;
            if (distance(self.point, target.point) > ai<number>(capability, "maxChase", 10)) return false;
            return ratio(target) < ai<number>(capability, "healBelow", 0.7);
        },
        accepts: function (context, _capability, target) {
            const self = source(context);
            return target.friendly && target.health > 0 && String(target.ref) !== String(self.ref);
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            if (!target.friendly || String(target.ref) === String(source(context).ref)) return 0;
            const r = ratio(target);
            let score = r < 0.4 ? 100 : 40;
            if (r < 0.25) score += 12;
            if (status(context, target, "grassyterrain")) score += 8;
            return score;
        }
    });
}
