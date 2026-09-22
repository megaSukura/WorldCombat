/** Integration examples for native loadout/resources; formal content design continues in P5. */
namespace NativeMoves {
    function impact(action: CombatAction, hit: CombatImpact, move: CombatPokemonMove): void {
        var target = hit.target();
        if (target !== null && target.domain() !== "cobblemon") { action.reject("unsupported-target"); return; }
        var features: Partial<NativeEffects.Move> = { contact: move.id() === "tackle" || move.id() === "vinewhip" };
        if (move.id() === "ember") { features.status = "burn"; features.chance = 0.1; }
        PokemonDamage.hit(action, hit, move, features);
    }
    function register(id: string, ticks: number, range: number,
                      cast: (action: CombatAction, move: CombatPokemonMove) => void): void {
        var actionId = "cobblemon_world_combat:native_" + id;
        NativeLoadout.define(id, actionId, "p4.5", ticks, "aim", range, function (action, move) {
            var target = action.target();
            if (target !== null && target.domain() !== "cobblemon") { action.reject("unsupported-target"); return; }
            cast(action, move);
        });
        WorldCombat.preview(actionId, JSON.stringify({ lineOfSight: true }));
    }
    function contact(action: CombatAction, move: CombatPokemonMove, windup: number, cooldown: number, range: number): void {
        action.particle(action.origin());
        action.after(NativeSemantics.windup(action, move, windup), function (ready) {
            var origin = ready.origin(), target = ready.targetPosition();
            if (target.minus(origin).length() > Math.min(range, ready.range())) { ready.reject("out-of-range"); return; }
            ready.commit(cooldown);
            var hit = ready.trace(origin, target, 0.25);
            ready.particle(hit.position());
            if (hit.hitEntity()) impact(ready, hit, move);
            ready.finish();
        });
    }
    function projectile(action: CombatAction, move: CombatPokemonMove, windup: number, cooldown: number, speed: number, range: number): void {
        action.particle(action.origin());
        action.after(NativeSemantics.windup(action, move, windup), function (ready) {
            ready.commit(cooldown);
            Projectiles.launch(ready, speed, Math.min(range, ready.range()), 0.15, function (current, hit) { impact(current, hit, move); },
                NativeSemantics.aim(ready, move, ready.targetPosition().minus(ready.origin()), 0.2));
        });
    }
    export function install(): void {
        register("tackle", 30, 3.5, function (a, m) { contact(a, m, 6, 35, 3.5); });
        register("vinewhip", 30, 4, function (a, m) { contact(a, m, 8, 40, 4); });
        register("ember", 80, 18, function (a, m) { projectile(a, m, 6, 40, 0.75, 18); });
        register("watergun", 60, 16, function (a, m) { projectile(a, m, 4, 30, 1.2, 16); });
    }
}
if (typeof CobblemonCombat !== "undefined") NativeMoves.install();
