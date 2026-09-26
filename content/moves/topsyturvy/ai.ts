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

    function topsyChase(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        return CompanionBehavior.ai<number>(item, "maxChase", 10);
    }

    function topsyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || !target.visible) return false;
        if (context.facts.focus === target.ref) return true;
        return CompanionBehavior.distance(source(context).point, target.point) <= topsyChase(context, item);
    }

    /** 对敌：只有净翻转对它不利（增益多于减益，或择映式下确有增益）才值得甩镜，绝不帮它解掉弱化。
     *  对友：看它被削了多少减益（值高才值得救）。 */
    function topsyEnemyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (threat.friendly) return false;
        if (!topsyWants(context, item, threat)) return false;
        const positive = topsyStageValue(context, threat, "positive");
        const negative = topsyStageValue(context, threat, "negative");
        if (item.data.config && item.data.config.gain === true) return positive > 0;
        return positive > negative;
    }

    function topsyAllyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, ally: Entity): boolean {
        if (!ally.friendly || String(ally.ref) === String(source(context).ref)) return false;
        if (!topsyWants(context, item, ally)) return false;
        return topsyStageValue(context, ally, "negative") > 0;
    }

    registerUse("topsyturvy", {
        protocols: ["world_combat:attack", "world_combat:control", "world_combat:bolster"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (target === null) return true;
            return target.friendly ? topsyAllyWants(context, item, target) : topsyEnemyWants(context, item, target);
        },
        accepts: function (context, item, target) {
            if (target.health <= 0 || !target.visible) return false;
            return target.friendly ? topsyAllyWants(context, item, target) : topsyEnemyWants(context, item, target);
        },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || (target.friendly ? !topsyAllyWants(context, item, target) : !topsyEnemyWants(context, item, target))) return 2;
            if (target.friendly) {
                const negative = topsyStageValue(context, target, "negative");
                let score = 20 + negative * 8;
                if (context.facts.focus === target.ref) score += 8;
                return Math.max(2, Math.min(96, score));
            }
            const positive = topsyStageValue(context, target, "positive");
            const negative = topsyStageValue(context, target, "negative");
            const onlyGains = !!(item.data.config && item.data.config.gain === true);
            let score = 16 + positive * 8;
            if (positive >= CompanionBehavior.ai<number>(item, "minStages", 1)) score += 10;
            // 全翻式下，减益越多翻完越帮对手；先算净值，避免替敌人解掉它的弱化。
            if (!onlyGains) score -= negative * 6;
            if (context.facts.focus === target.ref) score += 8;
            return Math.max(2, Math.min(96, score));
        }
    });

    PokemonSkills.addPreferences("topsyturvy", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 20, step: 1,
            help: "威胁或受削的队友进入这个距离内才考虑甩镜；越大越早出手、也越容易空放。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.minStages"), "抬价门槛", "number", {
            min: 1, max: 6, step: 1,
            help: "对手正面等级合计达到这么多时，才把颠倒抬到高于普通交战；调 1 见一丝增益就优先翻，调大只在对手攒大了才优先。"
        })
    ]);
}
