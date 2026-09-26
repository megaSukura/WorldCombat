/**
 * 盐水 / brine 的伙伴 AI 用途。
 *
 * 什么局面下出手：目标是可见、敌对、存活的活体，且在 `ai.maxChase`（默认 16）格内；更远交给共享接近逻辑。
 * 对谁出手：`ai.finishWounded`（默认开）打开时，优先**此刻**血量已在一半或以下的残血目标——这一击对它们翻倍，
 *   正是收割的时机；满血的目标（包括满血 Boss）按普通远程攻击排序，不假设它以后会掉到一半。够不到就靠近。
 * 放完之后交回共享交战计划；它只结算一条直射细流，不留区域。
 */
namespace CompanionBehavior {
    function brineWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
    }

    CompanionBehavior.registerUse(PokemonSkills.brineId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return brineWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !brineWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > Number(capability.data.range)) return 0;
            let score = 14;
            // 只看目标现在的血：半血以下才翻倍，满血目标不加「将来会残」的分。
            if (CompanionBehavior.ai<boolean>(capability, "finishWounded", true) && CompanionBehavior.ratio(target) <= 0.5) score += 30;
            if (CompanionBehavior.status(context, target, "soaked")) score -= 4;
            return score;
        }
    });

    const brinePress = PokemonSkills.flag("press", "高压式");
    brinePress.help = "开启（高压式）：盐卤威力 ×1.15、射程 ×1.15、判定更细，但湿身更短、起手多 2 刻、冷却多 4 刻，用来点杀残血；关闭（泼洒式，默认）：判定更粗、湿身更久、更快更省，用来稳住补刀。";
    const brineChase = PokemonSkills.number("ai.maxChase", "出手距离", 4, 24, 1);
    brineChase.help = "超过这个距离就不主动出手，先走近；越大越愿意在更远处先射一记。";
    const brineFinish = PokemonSkills.flag("ai.finishWounded", "收割残血");
    brineFinish.help = "开启：对手此刻血量在一半或以下时把这一击抬到高优先级，因为对它们威力翻倍；满血目标（含 Boss）不加这份分，关闭则只按普通远程攻击排序。";

    PokemonSkills.addPreferences(PokemonSkills.brineId, { ai: { maxChase: 16, finishWounded: true } },
        [brinePress, brineChase, brineFinish]);
}
