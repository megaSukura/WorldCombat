/**
 * 致命针刺的 AI：短距收尾，专门找这一击能放倒的目标下手。
 *
 * 局面：有敌对、可见、存活的目标就可用；用本招实际公式预估的伤害与目标当前生命比较——预估足以清空目标时
 * 给出高优先（70 之上），否则按目标生命比例低于 35% 仍然给出高优先，以便据这一击拿击倒收益。
 * 出手：贴到本招实际突刺距离内再出手（射程取 distance 参数，不再是写死的 3.6）；够不到时共享任务负责逼近。
 */
namespace PokemonSkills {
    /** 本招实际公式的出手侧伤害预估：与出手读同一条 power/攻击/本系加成链。非宝可梦或失败时回退 0。 */
    function fellstingerEstimate(context: WorldBehavior.Context, capability: WorldBehavior.Capability): number {
        const world = CompanionBehavior.world(context), actor = world.source();
        try {
            const power = p(fellstingerId, "power", { world: world, actor: actor, skill: skills[fellstingerId],
                detail: { values: capability.data.config } });
            const facts = PokemonDamage.combatants.read(world, actor);
            const preview = PokemonDamage.preview(world, actor, facts, CobblemonCombat.moveTemplate(fellstingerId),
                damageFeatures(fellstingerId, "power"), { power: { value: power } });
            return preview && typeof preview.amount === "number" && isFinite(preview.amount) ? Math.max(0, preview.amount) : 0;
        } catch (error) {
            return 0;
        }
    }

    CompanionBehavior.registerUse(fellstingerId, {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) {
            const world = CompanionBehavior.world(context);
            try {
                return p(fellstingerId, "distance", { world: world, actor: world.source(), skill: skills[fellstingerId],
                    detail: { values: capability.data.config } });
            } catch (error) {
                return capability.data.range;
            }
        },
        available: function (context, item, purpose, target) {
            return !target || (!target.friendly && target.health > 0 && target.visible);
        },
        accepts: function (context, item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !target.visible || target.friendly) return 0;
            // 用实际伤害预估判断这一击能否收尾，而不是只看残血比例。
            if (fellstingerEstimate(context, item) >= target.health) return 90;
            return CompanionBehavior.ratio(target) < 0.35 ? 70 : 0;
        }
    });
}
