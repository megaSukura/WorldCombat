/**
 * 精神冲击 / psyshock —— AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、存活，且在 `ai.maxChase`（默认 17）格内；够不到交给共享接近逻辑。
 *   它便宜、冷却短，是常规中远距离输出，不必等特殊局面。
 * 对谁出手：一个看得见、还活着的非友方；在射程内排普通远程攻击的价，并按目标防御把伤害期望算进去——
 *   本招按物防结算，因此特防高、物防低的目标更值；未知模组目标按原生可读的防御事实给中性价。
 * 够不到怎么办：reach 就是本招实际射程，先走近再掷。
 * 放完之后：交回共享交战计划；命中的击退交给共享处理。
 */
namespace PokemonSkills {
    /** 本招按物防结算，理想目标是「特防高、物防低」；只有原生可读的防御事实参与，读不到就不偏。 */
    function psyshockDefenceScore(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const stats = CompanionBehavior.combatStats(context, target);
        const table = stats && stats.stats;
        if (!table) return 0;
        const def = table.def, spd = table.spd;
        if (typeof def !== "number" || !isFinite(def) || typeof spd !== "number" || !isFinite(spd)) return 0;
        return Math.round(Math.max(-6, Math.min(8, (spd - def) * 0.05)));
    }
    function psyshockWants(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(capability, "maxChase", 17);
    }

    CompanionBehavior.registerUse(psyshockId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return psyshockWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !psyshockWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const score = CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 22 : 0;
            return score + psyshockDefenceScore(context, target) + Math.round(CompanionBehavior.ratio(target) * 4);
        }
    });

    addPreferences(psyshockId, { ai: { maxChase: 17 } }, [
        field(pathOf("heavy"), "重棱", "boolean", {
            help: "开启：威力 ×1.22、击退 ×1.6、下坠更快，砸得更重；代价是弹速 ×0.8、射程 ×0.85、起手 +3 刻、冷却 +6 刻。关闭（轻棱）：更远、更快、更飘的一掷，威力与击退都轻。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 6, max: 26, step: 1,
            help: "超过这个距离就不主动凝棱，先走近；越大越愿意在更远处先手。"
        })
    ]);
}
