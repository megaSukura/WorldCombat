/**
 * Shared observations with explicit interpretation; callers choose the thresholds and uses.
 *
 * Two layers coexist. The native sky (Minecraft's clear/rain/thunder, light, time) is always readable from
 * `world.environment`. On top of it, content may publish a semantic weather field. Which kinds exist and what
 * each means to shared readers is a content declaration (`defineWeather`); the library never fixes a set.
 * The newest live weather field covering a point wins, so a later sky overrides an earlier one and the earlier
 * one resumes when the new field ends. With no field over the point the semantic reading is null (unknown),
 * while the native values stay available.
 */
namespace WorldEnvironment {
    /** Count matching exposed surface blocks with a caller-chosen sampling budget; unobserved cells are skipped. */
    export function sampleSurface(world: CombatWorld, centre: CombatPoint, radius: number, budget: number,
                                  matches: (block: CombatBlock) => boolean, above = 1, below = 2): { matched: number; sampled: number } {
        if (!isFinite(radius) || radius < 0 || !isFinite(budget) || budget < 0 || !isFinite(above) || !isFinite(below) || above < 0 || below < 0)
            throw new Error("Invalid surface sample bounds");
        var result = { matched: 0, sampled: 0 }, seen: { [key: string]: boolean } = {};
        var x0 = Math.floor(centre.x()), y0 = Math.floor(centre.y()), z0 = Math.floor(centre.z());
        for (var ring = 1; ring <= Math.round(radius) && result.sampled < Math.floor(budget); ring++) {
            var spokes = Math.max(1, Math.round(ring * 6));
            for (var spoke = 0; spoke < spokes && result.sampled < Math.floor(budget); spoke++) {
                var angle = spoke * Math.PI * 2 / spokes, x = x0 + Math.round(Math.cos(angle) * ring), z = z0 + Math.round(Math.sin(angle) * ring);
                var key = x + "," + z; if (seen[key]) continue; seen[key] = true; result.sampled++;
                for (var dy = Math.floor(above); dy >= -Math.floor(below); dy--) {
                    var block = world.block(WorldCombat.point(x, y0 + dy, z)); if (block === null) break;
                    if (["minecraft:air", "minecraft:cave_air", "minecraft:void_air"].indexOf(String(block.id())) >= 0) continue;
                    if (matches(block)) result.matched++; break;
                }
            }
        }
        return result;
    }
    export interface Weather {
        /** Flat replacement for the sunlight reading (0..1) while this weather is effective. */
        sunlight?: number;
        /** Or derive the reading from the native estimate; result is clamped to 0..1. */
        lit?: (base: number) => number;
    }
    var weathers: { [id: string]: Weather } = Object.create(null);
    export interface WeatherArea { id: number; source: string; pending: boolean; tags: string[]; }
    var sources: { id: string; read: (world: CombatWorld, point?: CombatPoint) => WeatherArea[] }[] = [];
    /** World integrations publish their live weather observations; this protocol also works with only native sky facts. */
    export function defineWeatherSource(id: string, read: (world: CombatWorld, point?: CombatPoint) => WeatherArea[]): void {
        if (sources.some(function (entry) { return entry.id === id; })) throw new Error("Duplicate weather source: " + id);
        sources.push({ id: id, read: read });
    }
    function areas(world: CombatWorld, point?: CombatPoint): WeatherArea[] {
        var result: WeatherArea[] = [];
        sources.forEach(function (entry) { result = result.concat(entry.read(world, point)); }); return result;
    }

    /** Declares what one semantic weather kind means to shared readers. Producers own which kinds exist. */
    export function defineWeather(id: string, definition: Weather = {}): void {
        if (!id) throw new Error("Weather id required");
        weathers[id] = { sunlight: definition.sunlight, lit: definition.lit };
    }
    export function weatherTag(id: string): string { return "world_combat:weather/" + id; }
    export function knownWeather(id: string): boolean { return !!weathers[id]; }

    export function read(world: CombatWorld, point: CombatPoint): any {
        var env = JSON.parse(String(world.environment(point)));
        var kind = weather(world, point);
        env.weather = kind;
        env.skyKnown = kind !== null;
        return env;
    }
    /** The newest live weather field covering a point, or null when no field declares one there. */
    export function weather(world: CombatWorld, point: CombatPoint): string | null {
        var values = areas(world, point), best: WeatherArea | null = null;
        for (var i = 0; i < values.length; i++) if (!values[i].pending && (!best || values[i].id > best.id)) best = values[i];
        if (!best) return null;
        for (var j = 0; j < best.tags.length; j++) {
            var tag = best.tags[j];
            if (tag.indexOf("world_combat:weather/") === 0) return tag.substring("world_combat:weather/".length);
        }
        return null;
    }
    export function isWeather(world: CombatWorld, point: CombatPoint, kind: string): boolean { return weather(world, point) === kind; }
    /** Ends this actor's own weather fields so a new sky replaces the old one; returns how many ended. */
    export function replaceOwnWeather(world: CombatWorld, actor: CombatActor): number {
        var values = areas(world), ref = String(actor.ref()), cleared = 0;
        for (var i = 0; i < values.length; i++) {
            if (values[i].pending || values[i].source !== ref) continue;
            if (world.operation(values[i].id, "world_combat:dispel", "{}")) cleared++;
        }
        return cleared;
    }
    function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
    /**
     * Native sun estimate (sky light × day × visible sky, dimmed by rain) unless a semantic weather field
     * covers the point, in which case that weather's declared meaning applies.
     */
    export function sunlight(world: CombatWorld, point: CombatPoint): number {
        var env = JSON.parse(String(world.environment(point)));
        var base = env.loaded && env.day && env.skyVisible ? Math.max(0, (env.skyLight / 15) * (1 - env.rain * .65)) : 0;
        var kind = weather(world, point);
        if (kind === null) return base;
        var definition = weathers[kind];
        if (!definition) return base;
        if (definition.lit) return clamp01(definition.lit(base));
        return definition.sunlight === undefined ? base : clamp01(definition.sunlight);
    }
}
