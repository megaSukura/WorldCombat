/**
 * Client visuals for Corrosion. One acid family: sickly lime with a darker green shadow and a
 * single hot bubble accent where the type immunity breaks.
 *
 * Moments:
 *   acid       - one-shot on the victim: an acid splash, a corroding ring and falling droplets.
 *   poison     - one-shot on a Steel/Poison Pokemon whose immunity broke: hot poison bubbles rise.
 *   acid_tick  - each second on the bearer: a small sizzle and a droplet fall.
 *   acid_state - while the acid holds: a thin ground seep, out of the sight line.
 *
 * The event source is the holder, so victim moments bind `target`.
 */
const CorrosionDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // Acid: splash on the body, a corroding ring, droplets pulling down.
        acid: {
            duration: 30,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "splash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: 10, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 16], size: [0.2, 0.03], sizeMode: "index",
                    color: 0x9FD44A, alpha: [0.95, 0], light: "full", bloom: 0.2
                },
                {
                    name: "corrode_ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2, at: 1, interval: 3 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.1],
                    lifetime: [12, 20], size: [0.36, 0.72],
                    color: 0x5E8C2E, alpha: [0.7, 0], light: "full", maxParticles: 5
                },
                {
                    name: "drip", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 6, at: 3, interval: 4, repeats: 2 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "down", speed: [0.03, 0.09], gravity: 0.03, drag: 0.94,
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0x7EB838, alpha: [0.8, 0], light: "world", maxParticles: 18
                }
            ]
        },
        // Poison break: hot bubbles climb the body.
        poison: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "hot_bubble", bind: "target", offset: [0, 0.05, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [16, 28], size: [0.16, 0.02],
                    color: 0xB6E24A, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "break_flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 7, at: 1 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [8, 14], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xCBF05A, alpha: [1, 0], light: "full", bloom: 0.3
                }
            ]
        },
        // Tick: a small sizzle each second.
        acid_tick: {
            duration: 18,
            emitters: [
                {
                    name: "sizzle", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/goo/acidsplash",
                    burst: { count: 5 }, shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.12], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0x9FD44A, alpha: [0.85, 0], light: "full", maxParticles: 12
                },
                {
                    name: "tick_drop", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "down", speed: [0.03, 0.08],
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0x7EB838, alpha: [0.6, 0], light: "world", maxParticles: 12
                }
            ]
        },
        // State: a slow ground seep while the acid lasts.
        acid_state: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "seep", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 3, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [22, 38], size: [0.07, 0.02],
                    color: 0x7EB838, alpha: [0.35, 0], light: "world", maxParticles: 12
                },
                {
                    name: "state_rim", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2, shape: { kind: "ring", radius: 0.44 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [26, 40], size: [0.36, 0.46], sizeMode: "sin",
                    color: 0x5E8C2E, alpha: [0.14, 0.04], alphaMode: "sin",
                    light: "world", maxParticles: 8
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_corrosion", 1, CorrosionDefinition);
