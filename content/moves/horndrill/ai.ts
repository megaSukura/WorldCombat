/**
 * 角钻 / horndrill 的伙伴 AI 用途。
 *
 * 什么局面下出手：一次近身直线钻穿。`available` 要求目标可见、敌对、存活、不受一般系免疫，
 *   且在自己 `ai.maxChase`（默认 8）格内；焦点目标不受距离限制。`priority` 在目标生命比例高于
 *   `ai.executionAbove`（默认 0.2）时抬一档——把一击必杀留给还满血的对手，别浪费在残血身上。
 * 对谁出手：当前威胁；幽灵属性（一般系打不动）不接受。够不到交给共享接近逻辑，射程就是冲程。
 * 放完之后：长冷却期间改用别的招；落空时钻头停在原地，AI 会重新走位再找机会。
 */
namespace CompanionBehavior {
    function horndrillImmune(target: CompanionBehavior.Entity): boolean {
        const types = target.facts && target.facts.types;
        if (!types || !types.length) return false;
        for (let index = 0; index < types.length; index++) if (CobblemonCombat.typeEffectiveness("normal", types[index]) === 0) return true;
        return false;
    }

    function horndrillWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        const access = CompanionBehavior.world(context), observed = access.actor(String(target.ref));
        if (observed && access.effects(observed, PokemonSkills.horndrillResisted).length) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return !horndrillImmune(target);
    }

    registerUse("horndrill", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!horndrillWants(context, capability, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 8);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && !horndrillImmune(target);
        },
        priority: function (context, capability, target) {
            if (!target || !capability || !horndrillWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            const ratio = target.maximum > 0 ? target.health / target.maximum : 1;
            if (ratio < CompanionBehavior.ai<number>(capability, "executionAbove", 0.2)) return 4;
            return ratio >= 0.6 ? 30 : 24;
        }
    });

    PokemonSkills.addPreferences("horndrill", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("wide"), "扩钻式", "boolean", {
            help: "开启：钻头判定 ×1.35，代价是冲程 ×0.85、起钻蓄势 +6 刻、收招 +4 刻——更慢更短、对手更好躲，但不在正中也会被扫到。关闭（细钻式）：更长更快、收招更短，但在差之毫厘时会擦身而过。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑角钻；调小只在近处起钻，调大愿意先追进冲程里。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.executionAbove"), "残血留手阈值", "number", {
            min: 0, max: 0.8, step: 0.05,
            help: "目标生命比例低于这个值时，不再把一击必杀浪费在它身上；调大只在目标还很健康时出手。"
        })
    ]);
}
