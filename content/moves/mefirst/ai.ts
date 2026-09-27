/** Select only observed current preparation or a registered native form; aggro alone is not attack intent. */
namespace PokemonSkills {
    function mefirstObserved(context: WorldBehavior.Context, target: CompanionBehavior.Entity): { prepared: boolean; native: NativeAttackProjection.Replay | null } {
        const world = CompanionBehavior.world(context), actor = world.actor(target.ref);
        if (!actor || !world.valid(actor)) return { prepared: false, native: null };
        const prepared = AttackStarts.authored(world, actor, AttackStarts.cursor()).some(start => start.remaining > 1 && mefirstCopyable(start.identity));
        const facts = AttackStarts.native(world, actor, 0).records;
        let replay: NativeAttackProjection.Replay | null = null;
        facts.forEach(start => { const supported = NativeAttackProjection.fromStart(start, 18); if (supported) replay = supported; });
        return { prepared, native: replay };
    }
    CompanionBehavior.registerUse(mefirstId, {
        protocols: ["world_combat:attack"],
        reach: function (context, item) {
            const target = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
            if (!target) return item.data.range;
            const observed = mefirstObserved(context, target), world = CompanionBehavior.world(context);
            return observed.native && !observed.prepared ? Math.min(item.data.range, NativeAttackProjection.reach(world, world.source(), observed.native)) : item.data.range;
        },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted || !target || target.friendly || !(target.health > 0) || !target.visible) return false;
            if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) {
                if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > item.data.range) return false;
            }
            if (CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
            const observed = mefirstObserved(context, target);
            return observed.prepared || observed.native !== null;
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, _item, target) {
            if (!target) return 0;
            const observed = mefirstObserved(context, target);
            return observed.prepared ? 62 : observed.native ? 38 : 0;
        }
    });
    addPreferences(mefirstId, {}, [
        flag("patient", "耐心"), number("ai.maxChase", "守候距离", 3, 22, 1), flag("ai.leaveStation", "驻守时允许离位")
    ]);
}
