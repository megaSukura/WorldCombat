/**
 * Reusable lowercase-type colour table. Native move facts expose type ids in their Showdown form
 * ("normal", "fire", ...), so the table is keyed by those ids and every consumer normalises to
 * lowercase before lookup.
 *
 * Shared by server appearance data and client particle definitions. Type knowledge stays in the
 * Cobblemon content library; the renderer only maps payload strings through caller-provided colours.
 */
namespace TypeColors {
    export const colors: { [type: string]: number } = {
        normal: 0xA8A878, fire: 0xEE8130, water: 0x6390F0, electric: 0xF7D02C, grass: 0x7AC74C,
        ice: 0x96D9D6, fighting: 0xC22E28, poison: 0xA33EA1, ground: 0xE2BF65, flying: 0xA98FF3,
        psychic: 0xF95587, bug: 0xA6B91A, rock: 0xB6A136, ghost: 0x735797, dragon: 0x6F35FC,
        dark: 0x705746, steel: 0xB7B7CE, fairy: 0xD685AD
    };
    /** Standard hue for a native type id; unknown ids use `fallback` (default white). */
    export function of(type: string, fallback?: number): number {
        const value = colors[String(type || "").toLowerCase()];
        return value === undefined ? (fallback === undefined ? 0xFFFFFF : fallback) : value;
    }
    export function binding(attribute: string, fallback: number = 0xFFFFFF): { attribute: string; colors: { [id: string]: number }; fallback: number } {
        return { attribute: attribute, colors: colors, fallback: fallback };
    }
    /** A copy with each channel scaled by `factor` (0..1); useful for a dimmer companion shade. */
    export function shade(type: string, factor: number, fallback?: number): number {
        const base = of(type, fallback), amount = Math.max(0, Math.min(1, factor));
        const r = Math.round(((base >> 16) & 0xFF) * amount);
        const g = Math.round(((base >> 8) & 0xFF) * amount);
        const b = Math.round((base & 0xFF) * amount);
        return (r << 16) | (g << 8) | b;
    }
}
