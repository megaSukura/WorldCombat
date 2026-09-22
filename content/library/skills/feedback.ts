namespace PokemonSkills {
    export const damageFeedback = new WorldContributions.Registry<{ data: any; event: CombatWorldEvent; suppress: boolean }>();
    PokemonDamage.onImmunity("world_combat:immunity", function (world, target, metadata) {
        var body = world.observe(target);
        if (!body)
            return;
        feedback(world, target, body.position(), "immune", { type: JSON.parse(metadata).type || "" });
    });
    export function feedback(world: CombatWorld, target: CombatActor, point: CombatPoint, kind: string, extra?: any): void {
        var data: any = { actor: String(target.ref()), kind: kind, start: world.tick(), duration: 36 };
        if (extra)
            Object.keys(extra).forEach(function (key) { data[key] = extra[key]; });
        WorldFeedback.emit(world, "world_combat:feedback", 1, point, data, data.duration);
    }
    // Secondary-status receipts: an applied status keeps its producer's own presentation; only a refused one
    // floats a reason here, and at most once per target/status/outcome per short window so it never spams.
    var secondaryAt: { [key: string]: number } = Object.create(null);
    CombatStatus.secondary.define({ id: "world_combat:secondary-feedback", apply: function (context) {
        // Only a real miss or a real immunity is player-facing; internal no-carrier/unavailable states stay silent.
        if (context.outcome !== "miss" && context.outcome !== "immune") return;
        var world = context.world, target = context.target;
        if (!world.valid(target)) return;
        var body = world.observe(target); if (body === null) return;
        var key = String(target.ref()) + "/" + context.name + "/" + context.outcome;
        if (world.tick() - (secondaryAt[key] || -1000) < 20) return;
        secondaryAt[key] = world.tick();
        feedback(world, target, body.position(), context.outcome, {});
    } });
    // The shared confusion carrier owns its own failure line; per-move variants keep their reaction (chip, text).
    CombatStatus.rejected.define({ id: "world_combat:confusion-feedback", apply: function (context) {
        if (context.status !== "confusion") return;
        var carrier = context.details && context.details.effect !== undefined ? String(context.details.effect) : "";
        var shared = CombatStatus.defaultCarrier("confusion");
        if (!shared || carrier !== shared.effect) return;
        var world = context.world, actor = context.actor;
        if (!world.valid(actor)) return;
        var body = world.observe(actor); if (body === null) return;
        feedback(world, actor, body.position(), "miss", {});
    } });
    WorldCombat.on("world_combat:damage-feedback", "world_combat:damage_applied", "", function (event) {
        var data = JSON.parse(event.data()), world = event.world(), target = event.target();
        if (!target || !world.valid(event.actor()) || data.actual <= 0 || typeof data.x !== "number")
            return;
        if (String(event.actor().domain()) !== "cobblemon" && String(target.domain()) !== "cobblemon")
            return;
        if (damageFeedback.apply({ data, event, suppress: false }).suppress) return;
        feedback(world, target, WorldCombat.point(data.x, data.y, data.z), data.critical ? "critical" : "damage", {
            amount: Math.round(data.actual / (data.targetScale || 1) * 10) / 10, type: data.type || "", effectiveness: data.effectiveness,
            move: data.move, motionId: data.motionId
        });
    });
}
