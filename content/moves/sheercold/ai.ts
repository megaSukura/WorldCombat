/**
 * 绝对零度 / sheercold 的伙伴 AI 用途。
 *
 * 什么局面下出手：一圈有限冻伤。`available` 要求施术者未骑乘、目标可见、敌对、存活、非冰属性且在
 *   `ai.maxChase`（默认 8）格内；并且**以选定落点为心的冻区**里至少有 `ai.minFoes`（默认 1）个可见、
 *   非冰目标的敌人——用落点计数，而不是以自身为圈心。`priority` 随落点圈内人数抬升，预算足够终结目标时再抬一档。
 * 对谁出手：当前威胁；冰属性（原生 ohko: "Ice" 的沿用）不接受，也不按目标最大生命排序。
 * 够不到交给共享接近逻辑，射程就是冻结半径。放完之后：长冷却期间改用别的招；地上只留下一片不造成伤害的残霜。
 */
namespace CompanionBehavior {
    function sheercoldIce(target: CompanionBehavior.Entity): boolean {
        const types = target.facts && target.facts.types;
        return !!types && types.indexOf("ice") >= 0;
    }

    /** 以**选定落点**为圈心、冻结半径内可见、非冰目标的人数；不用施法者自身的位置计数。 */
    function sheercoldCount(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], radius = item.data.range;
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || !other.visible || sheercoldIce(other)) continue;
            if (CompanionBehavior.distance(target.point, other.point) <= radius) count++;
        }
        return count;
    }

    /** 本个体这一记每敌结算的固定伤害预算；与招式执行同一条公式。 */
    function sheercoldBudget(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(18, PokemonSkills.p(PokemonSkills.sheercoldId, "frost",
                { world: world, actor: world.source(), skill: PokemonSkills.skills[PokemonSkills.sheercoldId], detail: { values: item.data.config || {} } }));
        } catch (error) {
            return 18;
        }
    }

    function sheercoldWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return !sheercoldIce(target);
    }

    registerUse("sheercold", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) { return capability.data.ready !== false; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!sheercoldWants(context, capability, target)) return false;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                > CompanionBehavior.ai<number>(capability, "maxChase", 8)) return false;
            return sheercoldCount(context, capability, target) >= CompanionBehavior.ai<number>(capability, "minFoes", 1);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && !sheercoldIce(target);
        },
        priority: function (context, capability, target) {
            if (!target || !capability || !sheercoldWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const count = sheercoldCount(context, capability, target);
            let base = count >= 2 ? 24 + Math.min(20, (count - 1) * 7) : 20;
            // 预算足够直接终结当前目标时再抬一档（不算最大生命，按目标当前生命）。
            if (target.health <= sheercoldBudget(context, capability)) base += 8;
            return base;
        }
    });

    PokemonSkills.addPreferences("sheercold", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("glacial"), "冰河式", "boolean", {
            help: "开启：冻结半径 ×1.2、寒霜更久（×1.3），代价是结霜延迟 +7 刻、冷却 +10——圈更大、霜更持久，代价是预告更慢。关闭（急冻式）：结霜更快、冷却更短，但圈更小、霜更短。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑绝对零度；调小只在近处放，调大愿意先追进冻结半径。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.minFoes"), "冻伤人数", "number", {
            min: 1, max: 5, step: 1,
            help: "以选定落点为心的冻区里至少站着这么多可见、非冰属性的敌人才出手；调大只在被围住时用，调 1 见一个也冻。"
        })
    ]);
}
