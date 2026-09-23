/** A default mechanism-library protocol. The host has no built-in damage stages. */
namespace EffectProtocols {
    export function impact(json: string): string {
        var value = JSON.parse(json);
        if (typeof value.amount !== "number" || !isFinite(value.amount) || value.amount < 0)
            throw new Error("Impact amount must be finite and nonnegative");
        return JSON.stringify(value);
    }
    export function unchanged(version: number, json: string): string {
        throw new Error("An explicit state migration is required from schema " + version);
    }
    /** Incoming amounts use Minecraft's finite float representation. */
    export function incoming(json: string): string {
        var value = JSON.parse(json);
        if (typeof value.amount !== "number" || !isFinite(value.amount) || value.amount < 0 || value.amount > 3.4028234663852886e38)
            throw new Error("Invalid native incoming amount");
        return JSON.stringify(value);
    }
}
WorldCombat.event("world_combat:impact", 1, EffectProtocols.impact);
WorldCombat.phase("world_combat:impact", "world_combat:propose", "");
WorldCombat.phase("world_combat:impact", "world_combat:intercept", "world_combat:propose");
WorldCombat.phase("world_combat:impact", "world_combat:modify", "world_combat:intercept");
WorldCombat.phase("world_combat:impact", "world_combat:resolve", "world_combat:modify");
WorldCombat.phase("world_combat:impact", "world_combat:after", "world_combat:resolve");
WorldCombat.event("world_combat:incoming", 1, EffectProtocols.incoming);
WorldCombat.phase("world_combat:incoming", "world_combat:intercept", "");
WorldCombat.phase("world_combat:incoming", "world_combat:modify", "world_combat:intercept");
WorldCombat.phase("world_combat:incoming", "world_combat:resolve", "world_combat:modify");
WorldCombat.on("world_combat:effects_incoming", "world_combat:damage_incoming", "world_combat:status/attacks", function (event) {
    var target = event.target();
    if (target !== null) {
        if (JSON.parse(event.data()).bypassesInvulnerability) return;
        var world = event.world(), incoming = DamageSemantics.normalize(JSON.parse(event.data()));
        var data = JSON.parse(world.signal("world_combat:incoming", 1, target, JSON.stringify(incoming)));
        if (data.redirect && !JSON.parse(event.data()).redirected) {
            var recipient = world.actor(data.redirect); delete data.redirect;
            if (recipient !== null && recipient.key() !== target.key() && !world.friendly(recipient)) {
                data.redirected = true;
                // The transferred amount was calculated against the original defender. The new
                // recipient's armor has not participated yet and must follow its full native chain.
                delete data.armorExcluded; delete data.toughnessExcluded;
                delete data.armorAddedExcluded; delete data.toughnessAddedExcluded; delete data.ignoreDefenceStages;
                if (data.amount > 0) world.hurt(recipient, data.amount, JSON.stringify(data));
                data.amount = 0;
            }
        }
        event.data(JSON.stringify(data));
    }
});
