/**
 * Client definition for Innards Out.
 *
 * One scene, three moments, told from the fall spot back to the killer:
 * - fall:  the fatal blow lands and the health the holder still had erupts from its body as a
 *          gout of glistening innards; the mass sinks and heaps at the spot, brightening through
 *          the short server pause before the answer,
 * - burst: the heap answers on the killer: a close detonation of gore, a ground ring, pale bits
 *          and settling dark haze,
 * - drain: a Pokemon killer loses a point of PP; a short rose siphon contracts onto its body.
 *
 * The colour family is the ability's viscera rose (0xA63A6E) with pale nacre highlights and a
 * near-black neutral for the haze. The bright rose is the only saturated accent and stays small.
 * Textures and frame sizes come from particle_types.txt.
 */
const InnardsOutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        fall: {
            duration: 24,
            exit: { stop: 14, drain: 26 },
            emitters: [
                {
                    name: "eruption", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [8, 14], size: [0.46, 0.05], sizeMode: "index",
                    color: 0xE0709E, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 24
                },
                {
                    name: "gore", bind: "point", offset: [0, 0.45, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 26, interval: 1, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.34], spread: 25,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [16, 28], size: [0.30, 0.12],
                    color: 0xC24E72, alpha: [0.95, 0], light: "world", maxParticles: 70
                },
                {
                    name: "glob", bind: "point", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 34, interval: 1, repeats: 2 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.16, 0.44], spread: 30,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [10, 20], size: [0.10, 0.02],
                    color: 0xE0709E, alpha: [0.9, 0], light: "full", maxParticles: 100
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 24, at: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [14, 26], size: [0.09, 0.02],
                    color: 0xF2D2E0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "heap", bind: "point", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    start: 5, rate: 7, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.005, 0.025],
                    lifetime: [14, 22], size: [0.22, 0.16], sizeMode: "sin",
                    color: 0xA63A6E, alpha: [0.3, 0.65],
                    light: "world", maxParticles: 40
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 14, drain: 28 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.26],
                    lifetime: [7, 13], size: [0.5, 0.06], sizeMode: "index",
                    color: 0xE0709E, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 24
                },
                {
                    name: "splatter", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/sludgesplash",
                    burst: { count: 44, interval: 2, repeats: 2 }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.18, 0.5], spread: 25,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 22], size: [0.15, 0.04],
                    color: 0xC24E72, alpha: [0.95, 0], light: "world", maxParticles: 100
                },
                {
                    name: "shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 28 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.2, 0.6], spread: 20,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 18], size: [0.08, 0.01],
                    color: 0xF2D2E0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.05],
                    lifetime: [14, 22], size: [0.32, 0.82],
                    color: 0xA63A6E, alpha: [0.8, 0], light: "world", maxParticles: 6
                },
                {
                    name: "haze", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8, at: 2, interval: 4, repeats: 2 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [18, 34], size: [0.26, 0.12],
                    color: 0x2E1220, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        },
        drain: {
            duration: 22,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "siphon", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.05],
                    lifetime: [12, 18], size: [0.3, 0.12],
                    color: 0xC24E72, alpha: [0.6, 0], light: "world", maxParticles: 24
                },
                {
                    name: "flecks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14, at: 1 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xF2D2E0, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "embers", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.06],
                    gravity: 0.02, drag: 0.95,
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0x2E1220, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_innardsout", 1, InnardsOutDefinition);
