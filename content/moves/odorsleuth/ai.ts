/** Use identification on Ghosts/runners, then search only the recently observed scent point. */
namespace CompanionBehavior {
    registerFact("world_combat:odorsleuth/trail", function (world, actor) {
        const trail = world.effects(actor, PokemonSkills.odorsleuthTrail)[0]; if (!trail) return null;
        const data = JSON.parse(trail.data());
        return !data.visible && world.tick() - data.seen <= data.memory && world.actor(data.ref) ? data : null;
    });
    function odorsleuthLost(context: WorldBehavior.Context): any {
        if (context.facts.mounted || context.facts.intent === "hold" || context.facts.intent === "stay" || context.senses["world_combat:threat"]) return null;
        return fact<any>(context, "world_combat:odorsleuth/trail", source(context));
    }
    registry.goal({ id: "world_combat:odorsleuth/search", propose: function (context) {
        const trail = odorsleuthLost(context);
        return trail ? [{ id: "scent:" + trail.ref, kind: "world_combat:odorsleuth/search", data: { ref: trail.ref } }] : [];
    } });
    registry.method({ id: "world_combat:odorsleuth/search", propose: function (_context, goal) {
        return goal.kind === "world_combat:odorsleuth/search" ? [{ id: "last-seen", data: {} }] : [];
    }, create: function () { return WorldBehavior.step(function (context) {
        const trail = odorsleuthLost(context); if (!trail) return WorldBehavior.success();
        if (distance(source(context).point, trail.point) <= .8) return WorldBehavior.success();
        const result = navigate(context, trail.point, .8);
        return result === "path-blocked" ? WorldBehavior.success() : WorldBehavior.running();
    }); } });
    orderGoals("world_combat:odorsleuth/search", function (_context, order) {
        const at = order.indexOf("world_combat:command"); order.splice(at < 0 ? order.length : at, 0, "world_combat:odorsleuth/search");
    });
    PokemonSkills.addPreferences("odorsleuth", { ai: { maxChase: 14, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 22, 1),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function odorsleuthTargetGhost(context: WorldBehavior.Context, target: Entity): boolean {
        const facts = pokemonFacts(context, target);
        return !!facts && Array.isArray(facts.types) && facts.types.indexOf("ghost") >= 0;
    }

    function odorsleuthWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.mounted) return false;
        if (status(context, threat, "odorsleuth") || status(context, threat, "foresight")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        if (distance(self.point, threat.point) > ai<number>(item, "maxChase", 14)) return false;
        return !!world(context).clear(point(self.point), point(threat.point));
    }

    registerUse("odorsleuth", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || odorsleuthWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !odorsleuthWants(context, item, target)) return 0;
            if (fleeing(context, target)) return 86;
            if (odorsleuthTargetGhost(context, target)) return 78;
            return 56;
        }
    });
}
