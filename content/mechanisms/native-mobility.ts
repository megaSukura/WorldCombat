/** Domain rules translate cultivated facts into world movement; the native movement controller remains in charge. */
namespace NativeMobility {
    export interface Policy {
        base: number; minimum: number; maximum: number;
        climate?: (world: CombatWorld, pokemon: CombatPokemon, state: NativeEffects.State) => number;
    }
    /**
     * Pack setting with a script default. Only an absent native bridge falls back; a live bridge is authoritative, so
     * an unknown key or an invalid value surfaces as an error instead of being silently masked.
     */
    export function setting(key: string, fallback: number): number {
        var api: any = (typeof CobblemonCombat === "undefined") ? null : CobblemonCombat;
        if (!api || typeof api.packConfig !== "function") return fallback;
        var value = api.packConfig(key);
        if (typeof value !== "number" || !isFinite(value)) throw new Error("Invalid pack setting: " + key);
        return value;
    }
    export function cultivated(pokemon: CombatPokemon): number {
        // Compare to a neutral level-scaled reference so both species and investment remain visible.
        return Math.sqrt(Math.max(1, pokemon.stat("spe")) / Math.max(1, 5 + 2 * pokemon.level()));
    }
    export function install(id: string, policy: Policy): void {
        NativeSemantics.navigationMultiplier = 1;
        WorldCombat.on(id, "world_combat:navigate", "cobblemon_world_combat:navigate", function (event) {
            if (String(event.actor().domain()) !== "cobblemon") return;
            var world = event.world(), pokemon = CobblemonCombat.pokemon(event.actor()), state = NativeEffects.read(world, event.actor());
            var request = JSON.parse(String(event.data()));
            var base = setting("mobilityBase", policy.base);
            var growth = Math.max(0, setting("mobilityGrowth", 1));
            var minimum = Math.max(0, setting("mobilityMinimum", policy.minimum));
            var maximum = setting("mobilityMaximum", policy.maximum);
            var factor = base * Math.pow(cultivated(pokemon), growth);
            factor = Math.max(minimum, factor);
            // A non-positive maximum disables the cap; a positive one never sits below the minimum.
            if (maximum > 0) factor = Math.min(Math.max(maximum, minimum), factor);
            if (policy.climate) factor *= policy.climate(world, pokemon, state);
            var movement = NativeAbilities.apply(world, event.actor(), "mobility", { factor: factor }, state);
            factor = movement.factor;
            request.speed = Math.max(0, Math.min(3, request.speed * factor));
            event.data(JSON.stringify(request));
        });
    }
}
