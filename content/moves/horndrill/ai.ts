/**
 * 角钻 / horndrill 的伙伴 AI 用途。
 *
 * 什么局面下出手：一次近身直线钻穿。`available` 要求目标可见、敌对、存活、不受一般系免疫，
 *   且在自己 `ai.maxChase`（默认 8）格内；焦点目标不受距离限制。
 * 对谁出手：优先慢移或被定住、留在这条直线上的目标；冲完会陷进敌人堆里的局面降权。幽灵属性（一般系打不动）不接受。
 *   够不到交给共享接近逻辑，射程就是冲程。
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
            // 角钻会把整个身体送进这条线：目标越慢、越被定住，越钻得中；冲完落在敌人堆里则更险。
            const motion = CompanionBehavior.velocity(context, target);
            const speed = motion ? Math.sqrt(motion[0] * motion[0] + motion[1] * motion[1] + motion[2] * motion[2]) : 0;
            let score = 22;
            score += Math.max(0, 10 - speed * 24);
            if (CompanionBehavior.bound(context, target)) score += 10;
            const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
            let guard = 0;
            for (let index = 0; index < nearby.length; index++) {
                const other = nearby[index];
                if (other.friendly || other.health <= 0) continue;
                if (CompanionBehavior.distance(other.point, target.point) <= 3) guard++;
            }
            return Math.max(0, score - Math.min(12, guard * 3));
        }
    });

    PokemonSkills.addPreferences("horndrill", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("wide"), "扩钻式", "boolean", {
            help: "开启：钻头判定 ×1.35，代价是冲程 ×0.85、起钻蓄势 +6 刻、收招 +4 刻——更慢更短、对手更好躲，但不在正中也会被扫到。关闭（细钻式）：更长更快、收招更短，但在差之毫厘时会擦身而过。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "追击距离", "number", {
            min: 2, max: 14, step: 1,
            help: "伙伴只在威胁离自己这么远以内时才考虑角钻；调小只在近处起钻，调大愿意先追进冲程里。"
        })
    ]);
}
