/**
 * Particle language for Lingering Aroma. One orchid family around the effect's own colour
 * 0xB45FD8: dark plum for the haze and dregs, light lilac for the detail and tracking glints.
 * A sickly scent reads as smoke and bubbles, not as fire or light.
 *
 * The server fires all of this from the attack event, so the entry source is the attacker:
 *   aura   - while the holder is engaged: a thin reek seeping off the holder's own body.
 *   cling  - a close blow lands: the reek bursts off the holder and coats the attacker.
 *   expose - the coated attacker is a Pokemon: the scent gives it away and its footing slips.
 *   sustain- the coating holds: a sparse veil kept on the bearer while the aroma lasts.
 *   pulse  - every 40 ticks the tracking glow is refreshed: a lilac shimmer over the bearer.
 */
const LingeringAromaDefinition: ParticleDefinition = {
    moments: {
        // The holder is the source of the smell. Low density at the feet and body, out of the sight line.
        aura: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "reek_cloud", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 5, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [26, 46], size: [0.30, 0.10],
                    color: 0xB45FD8, alpha: [0.16, 0.03], alphaMode: "sin",
                    light: "world", maxParticles: 20
                },
                {
                    name: "scent_motes", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 6, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 40], size: [0.07, 0.01],
                    color: 0xD9A6F0, alpha: [0.6, 0], light: "full", maxParticles: 28
                },
                {
                    name: "ground_ring", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [30, 42], size: [0.40, 0.52], sizeMode: "sin",
                    color: 0x7A3AA0, alpha: [0.16, 0.06], alphaMode: "sin",
                    light: "world", maxParticles: 10
                }
            ]
        },
        // The blow connects: the reek sprays off the holder and clamps onto the attacker.
        cling: {
            duration: 40,
            exit: { stop: 16, drain: 30 },
            emitters: [
                {
                    name: "splash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.28, thickness: 0.6 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 15], size: [0.30, 0.03], sizeMode: "index",
                    color: 0xE8C6F5, alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "reek_burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 14 }, shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [12, 24], size: [0.07, 0.01],
                    color: 0xB45FD8, alpha: [0.95, 0], light: "full", maxParticles: 28
                },
                {
                    name: "coat", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: 10, at: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [18, 34], size: [0.30, 0.14],
                    color: 0xB45FD8, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "wrap", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 4, at: 3, interval: 4, repeats: 2 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.01, 0.03], spin: 12,
                    lifetime: [16, 26], size: [0.30, 0.12],
                    color: 0x9C4FC4, alpha: [0.4, 0], light: "full", maxParticles: 20
                },
                {
                    name: "dregs", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    start: 4, rate: 8, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [24, 40], size: [0.28, 0.08],
                    color: 0x5A2E78, alpha: [0.24, 0], light: "world", maxParticles: 40
                }
            ]
        },
        // Pokemon only: the reek gives the attacker away and its footing slips downward.
        expose: {
            duration: 30,
            exit: { stop: 10, drain: 26 },
            emitters: [
                {
                    name: "sag", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.03, 0.12], gravity: 0.03, drag: 0.94,
                    lifetime: [14, 24], size: [0.10, 0.02],
                    color: 0x7A3AA0, alpha: [0.8, 0], light: "world", maxParticles: 20
                },
                {
                    name: "seal_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.05, 0.08],
                    lifetime: [12, 16], size: [0.34, 0.14],
                    color: 0x8A3FB0, alpha: [0.5, 0], light: "full"
                },
                {
                    name: "motes", bind: "source", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xD9A6F0, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        // The coating holds on the bearer. Sparse, low, breathing; the target stays readable.
        sustain: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "veil", bind: "target", offset: [0, 0.1, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 5, shape: { kind: "ring", radius: 0.38 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 34], size: [0.24, 0.08],
                    color: 0xB45FD8, alpha: [0.35, 0], alphaMode: "sin",
                    light: "world", maxParticles: 18
                },
                {
                    name: "feet_haze", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [24, 40], size: [0.22, 0.06],
                    color: 0x5A2E78, alpha: [0.2, 0], light: "world", maxParticles: 16
                },
                {
                    name: "crest", bind: "target", offset: [0, 0.2, 0], height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 3, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 28], size: [0.10, 0.02],
                    color: 0xC98AE8, alpha: [0.4, 0], alphaMode: "sin",
                    light: "full", maxParticles: 10
                }
            ]
        },
        // The 40-tick glow refresh: the stench shimmers so the bearer stays trackable.
        pulse: {
            duration: 24,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "glow_ring", bind: "target", offset: [0, 0.06, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 3 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.05],
                    lifetime: [14, 22], size: [0.28, 0.70],
                    color: 0xE0B0F5, alpha: [0.7, 0], light: "full", bloom: 0.3
                },
                {
                    name: "glint", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [10, 18], size: [0.10, 0.02],
                    color: 0xE8C6F5, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "puff", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: 5 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 28], size: [0.22, 0.10],
                    color: 0xB45FD8, alpha: [0.35, 0], light: "world"
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:ability_lingeringaroma", 1, LingeringAromaDefinition);
