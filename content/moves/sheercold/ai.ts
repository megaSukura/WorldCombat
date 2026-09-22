/**
 * 绝对零度 / sheercold 的伙伴 AI 用途。
 *
 * 什么局面下出手：一圈冻杀。`ready` 要求冻结半径内至少站着 `ai.minFoes`（默认 1）个可见、敌对、存活、
 *   不是冰属性的目标——它是唯一能一次罩住多人的处决，挤在一起时最划算。`available` 还要求目标本身在
 *   `ai.maxChase`（默认 8）格内。`priority` 随圈内人数抬升，人越多越优先。
 * 对谁出手：当前威胁；冰属性（原生 ohko: "Ice" 免疫）不接受。够不到交给共享接近逻辑，射程就是冻结半径。
 * 放完之后：长冷却期间改用别的招；地上会留下一片寒霜标出刚才的冻区。
 */
namespace CompanionBehavior {
    function sheercoldIce(target: CompanionBehavior.Entity): boolean {
        const types = target.facts && target.facts.types;
        return !!types && types.indexOf("ice") >= 0;
    }

    function sheercoldCount(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        const nearby = context.facts.nearby as CompanionBehavior.Entity[], self = CompanionBehavior.source(context);
        const limit = CompanionBehavior.ai<number>(item, "maxChase", 8), radius = item.data.range;
        let count = 0;
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.friendly || other.health <= 0 || !other.visible || sheercoldIce(other)) continue;
            if (CompanionBehavior.distance(self.point, other.point) <= Math.min(limit, radius)) count++;
        }
        return count;
    }

    function sheercoldWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return !sheercoldIce(target);
    }

    registerUse("sheercold", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        ready: function (context, capability) {
            return capability.data.ready !== false && sheercoldCount(context, capability) >= CompanionBehavior.ai<number>(capability, "minFoes", 1);
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!sheercoldWants(context, capability, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && !sheercoldIce(target);
        },
        priority: function (context, capability, target) {
            if (!target || !capability || !sheercoldWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const ratio = target.maximum > 0 ? target.health / target.maximum : 1;
            if (ratio < CompanionBehavior.ai<number>(capability, "executionAbove", 0.2)) return 4;
            const count = sheercoldCount(context, capability);
            return (ratio >= 0.6 ? 24 : 20) + Math.min(20, (count - 1) * 7);
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
        PokemonSkills.field(PokemonSkills.pathOf("ai.minFoes"), "冻杀人数", "number", {
            min: 1, max: 5, step: 1,
            help: "冻结半径内至少站着这么多可见、非冰属性的敌人才出手；调大只在被围住时用，调 1 见一个也冻。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.executionAbove"), "残血留手阈值", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "目标生命比例低于这个值时，不再把一击必杀浪费在它身上；调大只在目标还很健康时出手。"
        })
    ]);
}
