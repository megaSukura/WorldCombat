/**
 * 吸取力量 / strengthsap 的伙伴 AI 用途：这是这招自己的一套出手计划——贴身把强敌的力气按住，顺手回一口血。
 *
 * 什么局面有意义：有可见威胁、在 ai.maxChase 以内。它既是续航（按对手物攻回血），又是削弱（对手物攻下降），
 *   所以自己血量低于 ai.healBelow 时优先抬一档当回血用；对手当前有效物攻达到 ai.strongAt 时当作强敌优先抽；
 *   已被削到很弱、自己也不缺血时收益下降，不反复榨一个没有力气的目标。
 * 对谁出手：当前威胁；友方、倒下或不可见的不接受。
 * 够不到怎么办：reach 就是抽取距离（本族很短），超出先走近；抽不到就先让给远程招。
 * 放完之后：自己回了一口、对手物攻被按住，交回共享顺序继续交战。
 */
namespace CompanionBehavior {
    /** 该战斗者此刻的有效物攻（含能力等级）；取不到时返回 null，不把未知当零。 */
    function strengthsapAttack(context: WorldBehavior.Context, entity: Entity): number | null {
        const stats = CompanionBehavior.combatStats(context, entity);
        const attack = stats && stats.stats ? stats.stats.atk : null;
        return typeof attack === "number" && isFinite(attack) ? attack : null;
    }

    /** 本招当前实际抽取距离：用行动携带的偏好配置求值，和真正施放时一致。 */
    function strengthsapReach(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context);
        try {
            return Math.max(1.5, PokemonSkills.p("strengthsap", "reach", { world: world, actor: world.source(), detail: { values: capability.data.config } }));
        } catch (error) {
            return capability.data.range;
        }
    }

    registerUse("strengthsap", {
        protocols: ["world_combat:attack", "world_combat:heal"],
        reach: function (context, capability) { return strengthsapReach(context, capability); },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !capability) return 0;
            const dist = CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point);
            if (dist > strengthsapReach(context, capability)) return 0;
            const self = CompanionBehavior.source(context);
            const hurt = CompanionBehavior.ratio(self) < CompanionBehavior.ai<number>(capability, "healBelow", 0.8);
            const strongAt = CompanionBehavior.ai<number>(capability, "strongAt", 90);
            const foeAttack = strengthsapAttack(context, target), selfAttack = strengthsapAttack(context, self);
            const strong = foeAttack !== null && foeAttack >= strongAt;
            const outguns = foeAttack !== null && selfAttack !== null && foeAttack > selfAttack;
            const already = CompanionBehavior.status(context, target, "strength_sapped");
            // 缺血、面对高当前物攻者优先；已被削到很弱、且自己也不缺血时收益降低。
            let score = 26;
            if (hurt) score += 18;
            if (strong) score += 14;
            if (outguns) score += 6;
            if (!strong && !hurt) score -= 10;
            if (already && !hurt) score -= 8;
            return Math.max(0, score);
        }
    });

    PokemonSkills.addPreferences("strengthsap", { ai: { maxChase: 6, healBelow: 0.8, strongAt: 90, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 14, 1),
        PokemonSkills.number("ai.healBelow", "回血优先阈值", 0.3, 1, 0.05),
        PokemonSkills.number("ai.strongAt", "视为强敌物攻", 20, 160, 5),
        PokemonSkills.flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
