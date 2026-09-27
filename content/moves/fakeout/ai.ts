/** Encounter-opening clap: use only within the real step/palm reach, preferring known interruptible authored preparation. */
namespace PokemonSkills {
    function fakeoutWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted) return false;
        const world = CompanionBehavior.world(context);
        const actor = world.actor(CompanionBehavior.source(context).ref);
        if (actor === null || !fakeoutFresh(world, actor)) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        const victim = world.actor(target.ref);
        return victim !== null && world.closestPoint(victim, CompanionBehavior.point(CompanionBehavior.source(context).point))
            .minus(CompanionBehavior.point(CompanionBehavior.source(context).point)).length()
            <= Math.min(item.data.range, CompanionBehavior.ai<number>(item, "maxChase", 6));
    }

    CompanionBehavior.registerUse(fakeoutId, {
        protocols: ["world_combat:attack", "world_combat:contact"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            const world = CompanionBehavior.world(context);
            const actor = world.actor(CompanionBehavior.source(context).ref);
            if (actor === null || !fakeoutFresh(world, actor)) return false;
            return !target || fakeoutWants(context, capability, target);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target || !fakeoutWants(context, capability, target)) return 0;
            const self = CompanionBehavior.source(context);
            const world = CompanionBehavior.world(context), victim = world.actor(target.ref);
            if (victim !== null && LivingActions.preparing(world, victim).some(clock => {
                const skill = skills[clock.identity];
                return !!skill && (skill.interruptible === undefined || skill.interruptible === true);
            })) return 80;
            return CompanionBehavior.distance(self.point, target.point) <= capability.data.range ? 68 : 24;
        }
    });

    addPreferences(fakeoutId, {}, [
        field(pathOf("feint"), "佯攻式", "boolean", {
            help: "开启：拍得更轻（×0.85），但拍懵更久（持续 ×1.35）且起手快 1 刻，适合先手压制。关闭：硬拍式，拍得更重（×1.12）、懵得短（×0.9），适合开场抢一点伤害。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 12, step: 1,
            help: "对手离自己这么远以内才闪身拍过去；本招闪身距离短，调大也常够不到，调小则只在贴身开场时用。"
        })
    ]);
}
