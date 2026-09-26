/**
 * 吹捧 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享控制位的随手一放。
 *
 * 什么局面有意义：有可见威胁、目标还没被陶醉缠上、它在 ai.maxChase 以内。
 * 对谁出手：当前威胁；已经带着共享身份 confusion 的目标会被跳过。
 * 谨慎对待已知特殊输出者：目标当前有效特攻明显高于物攻时降低优先，因为把特攻礼物递给它等于资敌；
 * 普通生物没有已知特攻输出时只当一层混乱用。免混乱的目标同样降一档，别指望陶醉。
 * 放完之后：目标特攻更高、出手可能走神，伙伴交回共享顺序重新判断站位。
 */
namespace PokemonSkills {
    /** 共享门禁判定这具目标能否挂上混乱；火／免控等拒绝时降一档。 */
    function flatterControlImmune(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const actor = world.actor(target.ref);
        if (!actor) return false;
        return !CombatStatus.allowed(world, actor, "confusion", 1, 0, { unique: true }).allowed;
    }

    function flatterWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "confusion")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 14);
    }

    /** 已知特殊输出者（有效特攻明显高于物攻）就少递礼物；免混乱再降一档。 */
    function flatterCaution(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        let score = 55;
        const facts = CompanionBehavior.combatStats(context, target), stats = facts && facts.stats;
        if (stats) {
            const attack = isFinite(Number(stats.atk)) ? Number(stats.atk) : 0;
            const special = isFinite(Number(stats.spa)) ? Number(stats.spa) : 0;
            if (special > 0 && special > attack * 1.15) score -= 25;
        }
        if (flatterControlImmune(context, target)) score -= 30;
        return Math.max(0, score);
    }

    CompanionBehavior.registerUse("flatter", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (!target) return true;
            return flatterWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            return target && flatterWants(context, capability, target) ? flatterCaution(context, target) : 0;
        }
    });

    addPreferences("flatter", {}, [
        field(pathOf("tone"), "吹捧语气", "boolean", {
            help: "连珠吹捧：礼物 +1 级、失手几率 +12%%，但陶醉时长 ×0.7。缓缓称颂：陶醉 ×1.35，适合长时间消耗，但礼物更轻。"
        }),
        field(pathOf("ai.maxChase"), "吹捧距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑吹捧；越大越早开口。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去吹捧。"
        })
    ]);
}
