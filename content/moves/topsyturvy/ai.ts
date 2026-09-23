/** topsyturvy：行为、参数与目标条件以本单元实现为准。 */
namespace CompanionBehavior {
    /** 只读、回调内缓存的能力等级合计：argument "positive" 数正面，"negative" 数负面，"net" 数净值。 */
    CompanionBehavior.registerFact("world_combat:move_topsyturvy/stages", function (access: CombatWorld, actor: CombatActor, argument: any) {
        if (!access.valid(actor)) return 0;
        const stages = PokemonSkills.topsyStages(access, actor), mode = String(argument);
        let total = 0;
        for (let index = 0; index < PokemonSkills.topsyStats.length; index++) {
            const value = Number(stages[PokemonSkills.topsyStats[index]]) || 0;
            if (mode === "positive") { if (value > 0) total += value; }
            else if (mode === "negative") { if (value < 0) total += Math.abs(value); }
            else total += value;
        }
        return total + MobEffects.invertible(access, actor, mode === "negative" ? "harmful" : "beneficial").length;
    });

    function topsyStageValue(context: WorldBehavior.Context, target: Entity, mode: string): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_topsyturvy/stages", target, mode);
        return typeof value === "number" ? value : 0;
    }

    function topsyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.focus === threat.ref) return true;
        return CompanionBehavior.distance(source(context).point, threat.point) <= CompanionBehavior.ai<number>(item, "maxChase", 10);
    }

    registerUse("topsyturvy", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            return target === null ? true : topsyWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !topsyWants(context, item, target)) return 2;
            const positive = topsyStageValue(context, target, "positive");
            const negative = topsyStageValue(context, target, "negative");
            const onlyGains = !!(item.data.config && item.data.config.gain === true);
            let score = 16 + positive * 8;
            if (positive >= CompanionBehavior.ai<number>(item, "minStages", 1)) score += 10;
            if (!onlyGains) score -= negative * 6;
            if (context.facts.focus === target.ref) score += 8;
            return Math.max(2, Math.min(96, score));
        }
    });

    PokemonSkills.addPreferences("topsyturvy", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 20, step: 1,
            help: "威胁进入这个距离内才考虑甩镜；越大越早出手、也越容易空放。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.minStages"), "抬价门槛", "number", {
            min: 1, max: 6, step: 1,
            help: "对手正面等级合计达到这么多时，才把颠倒抬到高于普通交战；调 1 见一丝增益就优先翻，调大只在对手攒大了才优先。"
        })
    ]);
}
