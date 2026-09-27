/**
 * 断头钳 / guillotine 的伙伴 AI 用途。
 *
 * 什么局面下出手：一次贴身夹合。`available` 要求目标可见、敌对、存活、不受一般系免疫，且在自己
 *   `ai.maxChase`（默认 5）格内；焦点目标不受距离限制。它的起手最短，所以贴上去的瞬间就愿意出手。
 * 对谁出手：当前威胁；幽灵属性（一般系打不动）不接受。`priority` 优先这一夹预算内就能收尾、且被钉住
 *   留在钳口里的目标；耐打的 Boss 照常重夹，不因它血厚就回避。
 * 放完之后：夹中即结束；夹空的收招最久，这段时间 AI 会在原地挨打，所以只在贴身后才用。
 */
namespace CompanionBehavior {
    function guillotineImmune(target: CompanionBehavior.Entity): boolean {
        const types = target.facts && target.facts.types;
        if (!types || !types.length) return false;
        for (let index = 0; index < types.length; index++) if (CobblemonCombat.typeEffectiveness("normal", types[index]) === 0) return true;
        return false;
    }

    function guillotineWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return !guillotineImmune(target);
    }

    registerUse("guillotine", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!guillotineWants(context, capability, target)) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 5);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible && !guillotineImmune(target);
        },
        priority: function (context, capability, target) {
            if (!target || !capability || !guillotineWants(context, capability, target)) return 0;
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > capability.data.range) return 0;
            // 这一夹的预算由本招公式给出：优先能一次收尾的目标，其次优先被钉住、慢移因而留在钳口里的目标。
            const access = CompanionBehavior.world(context);
            const damage = PokemonSkills.p(PokemonSkills.guillotineId, "damage",
                { world: access, actor: access.source(), skill: PokemonSkills.skills[PokemonSkills.guillotineId], detail: { values: capability.data.config } });
            let score = 22;
            if (target.health > 0 && damage > 0 && target.health <= damage) score += 14;
            if (CompanionBehavior.bound(context, target)) score += 10;
            const motion = CompanionBehavior.velocity(context, target);
            const speed = motion ? Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]) : 0;
            return Math.max(0, score + Math.max(0, 8 - speed * 20));
        }
    });

    PokemonSkills.addPreferences("guillotine", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("wide"), "阔钳式", "boolean", {
            help: "开启：钳口张角 ×1.25、钳口长度 ×1.1，代价是合拢延迟 +5 刻、收招 +4 刻——更好夹中偏开的目标，代价是更慢、夹空更亏。关闭（窄钳式）：合得更快、收招更短，但只夹得住正前方那一小块。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 1, max: 10, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑断头钳；调小要求贴得很近，调大愿意先追上去再夹。"
        })
    ]);
}
