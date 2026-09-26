/**
 * 虚张声势 的伙伴 AI 用途：这是这招自己的一套出手计划，不是共享控制位的随手一放。
 *
 * 什么局面有意义：有可见威胁、目标还没被混乱缠上、它在 ai.maxChase 以内。
 * 对谁出手：当前威胁；已经带着共享身份 confusion 的目标会被跳过，不重复点火。
 * 控制免疫：共享门禁判定这具目标挂不上混乱时不再连续送礼（免得白送攻击又拉不到仇恨），留给别的选择。
 * 能不能吃得下它的强化攻击：目标当前有效物攻已经够一拳打倒我们，或我们自己生命比例过低时降低优先，
 * 因为礼物会立刻变成威胁；它已经被抬过攻击时也降低优先，收益递减。
 * 够不到怎么办：reach 就是本招射程，accepts 不按距离硬拒；伙伴会先走近到射程再开口。
 * 放完之后：目标攻击更高、出手可能作废、仇恨被拉向自己——所以出手后交回共享顺序，让伙伴重新判断站位。
 * 配置 goad（尖刻／冷嘲）决定礼物分量与怒火长度；ai.maxChase 决定追多远点火。
 */
namespace PokemonSkills {
    /** 共享门禁判定这具目标能否挂上混乱；火／免控等拒绝时不连续送礼。 */
    function swaggerControlImmune(context: WorldBehavior.Context, target: CompanionBehavior.Entity): boolean {
        const world = CompanionBehavior.world(context);
        const actor = world.actor(target.ref);
        if (!actor) return false;
        return !CombatStatus.allowed(world, actor, "confusion", 1, 0, { unique: true }).allowed;
    }

    function swaggerWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (CompanionBehavior.status(context, target, "confusion")) return false;
        if (swaggerControlImmune(context, target)) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
            <= CompanionBehavior.ai<number>(item, "maxChase", 12);
    }

    /** 能承受它被强化后的攻击才优先点火：一拳能打倒我们、自己已经虚弱、或它已经被抬过攻击时都降档。 */
    function swaggerTolerance(context: WorldBehavior.Context, target: CompanionBehavior.Entity): number {
        const stats = CompanionBehavior.combatStats(context, target);
        const values = stats && stats.stats;
        const attack = values && isFinite(Number(values.atk)) ? Number(values.atk) : 0;
        const self = CompanionBehavior.source(context);
        let score = 60;
        if (attack > 0 && attack >= self.health) score -= 20;
        if (CompanionBehavior.ratio(self) < 0.35) score -= 25;
        if (CompanionBehavior.stage(context, target, "atk") >= 2) score -= 15;
        return Math.max(0, score);
    }

    CompanionBehavior.registerUse("swagger", {
        protocols: ["world_combat:control"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (!target) return true;
            return swaggerWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            return target && swaggerWants(context, capability, target) ? swaggerTolerance(context, target) : 0;
        }
    });

    addPreferences("swagger", {}, [
        field(pathOf("goad"), "挑衅语气", "boolean", {
            help: "尖刻挑衅：礼物 +1 级、失手几率 +12%%，但怒火时长 ×0.75、反噬 ×1.3，适合趁对手还被队友架住时下狠手。冷嘲热讽：礼物更轻，怒火 ×1.35、反噬 ×0.7，适合长时间消耗。"
        }),
        field(pathOf("ai.maxChase"), "点火距离", "number", {
            min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑挑衅；越大越早开口，也越可能被反打。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，收到「驻守」指令时也会离开原位去挑衅。"
        })
    ]);
}
