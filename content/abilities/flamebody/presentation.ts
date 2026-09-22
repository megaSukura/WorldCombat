/**
 * Particle language for Flame Body. One ember-orange family on a low, slow heat outline.
 *
 * The holder is the source of the heat, so every moment reads from the body outward:
 *   aura       - while the holder is engaged: a low ring of embers and heat haze at the feet.
 *   contact    - a close blow lands and the heat flares, but nothing catches: sparks and a puff.
 *   sear       - the sear takes hold: the holder flares and the attacker is wrapped in fire.
 *   sear_tick  - each 20-tick chip while seared: a small spark-and-smoke pulse on the bearer.
 *   sear_state - the searing state itself, kept on the bearer while the effect lasts.
 *   burn       - a Pokemon attacker catches the native burn: a deeper red burst and rising flame.
 *
 * Emitters follow `bind: "source"` for the attacker and `bind: "target"` for the holder/bearer,
 * because the server triggers these from the attack event where the source is the attacker.
 */
const FlameBodyDefinition: ParticleDefinition = {
    moments: {
        // Persistent, engaged holder: low density at the feet so the target stays readable.
        aura: {
            emitters: [
                {
                    name: "heat_cloud", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    rate: 4, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [26, 46], size: [0.34, 0.10],
                    color: 0xFF9A54, alpha: [0.16, 0.03], alphaMode: "sin",
                    light: "world", maxParticles: 24
                },
                {
                    name: "foot_embers", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 8, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [22, 40], size: [0.075, 0.01],
                    color: 0xFFB25A, alpha: [0.7, 0], light: "full", maxParticles: 36
                },
                {
                    name: "heat_ring", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [30, 42], size: [0.45, 0.55], sizeMode: "sin",
                    color: 0xFF7A18, alpha: [0.18, 0.08], alphaMode: "sin",
                    light: "world", maxParticles: 12
                }
            ]
        },
        // A hit that does not catch: a short flare on the holder only.
        contact: {
            duration: 24,
            emitters: [
                {
                    name: "contact_impact", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.28, thickness: 0.6 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 15], size: [0.3, 0.03], sizeMode: "index",
                    color: 0xFFD070, alpha: [1, 0], light: "full"
                },
                {
                    name: "contact_sparks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 14 }, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.28], spread: 20,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [12, 24], size: [0.07, 0.01],
                    color: 0xFFC070, alpha: [0.95, 0], light: "full", maxParticles: 24
                },
                {
                    name: "contact_smoke", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 5, at: 2 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [16, 30], size: [0.2, 0.3],
                    color: 0xB08868, alpha: [0.25, 0], light: "world"
                }
            ]
        },
        // The sear takes hold: holder flare (target) plus the ignited attacker (source).
        sear: {
            duration: 40,
            emitters: [
                {
                    name: "sear_flare", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3, thickness: 0.5 },
                    direction: "outward", speed: [0.1, 0.32],
                    lifetime: [8, 16], size: [0.34, 0.03], sizeMode: "index",
                    color: 0xFFE08A, alpha: [1, 0], light: "full"
                },
                {
                    name: "sear_ember", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.1, 0.3], spread: 25,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [14, 28], size: [0.08, 0.01],
                    color: 0xFFB25A, alpha: [0.95, 0], light: "full", maxParticles: 32
                },
                {
                    name: "sear_ring", bind: "source", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, at: 1, interval: 3 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.02, 0.05],
                    lifetime: [14, 22], size: [0.3, 0.75],
                    color: 0xFF7A18, alpha: [0.85, 0], light: "full"
                },
                {
                    name: "sear_flame", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 5, interval: 3, repeats: 6 }, shape: { kind: "ring", radius: 0.38 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [16, 30], size: [0.16, 0.02],
                    color: 0xFF8A3A, alpha: [0.85, 0], light: "full", maxParticles: 48
                },
                {
                    name: "sear_smoke", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6, at: 4, interval: 6, repeats: 2 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [20, 36], size: [0.2, 0.3],
                    color: 0xB08868, alpha: [0.28, 0], light: "world"
                }
            ]
        },
        // One chip pulse on the bearer; the state below carries the rest of the duration.
        sear_tick: {
            duration: 18,
            emitters: [
                {
                    name: "tick_ember", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 7 }, shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xFFB25A, alpha: [0.9, 0], light: "full"
                },
                {
                    name: "tick_smoke", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 2 }, shape: { kind: "sphere", radius: 0.15 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [16, 28], size: [0.18, 0.26],
                    color: 0xB08868, alpha: [0.24, 0], light: "world"
                }
            ]
        },
        // The searing state: a thin veil on the bearer, out of the line of sight.
        sear_state: {
            emitters: [
                {
                    name: "state_flame", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 6, shape: { kind: "ring", radius: 0.38 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [18, 32], size: [0.15, 0.02],
                    color: 0xFF8A3A, alpha: [0.55, 0], light: "full", maxParticles: 24
                },
                {
                    name: "state_ember", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 8, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [16, 30], size: [0.06, 0.01],
                    color: 0xFFB25A, alpha: [0.75, 0], light: "full", maxParticles: 32
                },
                {
                    name: "state_smoke", bind: "target", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 3, direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 38], size: [0.18, 0.26],
                    color: 0xB08868, alpha: [0.2, 0], light: "world", maxParticles: 16
                }
            ]
        },
        // The native burn catches: darker embers and heavier flame than the sear itself.
        burn: {
            duration: 36,
            emitters: [
                {
                    name: "burn_core", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3, thickness: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 16], size: [0.3, 0.03], sizeMode: "index",
                    color: 0xFF6A2A, alpha: [1, 0], light: "full"
                },
                {
                    name: "burn_flame", bind: "source", offset: [0, 0.05, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: 6, interval: 4, repeats: 4 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.09],
                    lifetime: [16, 30], size: [0.18, 0.02],
                    color: 0xE0552A, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "burn_smoke", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 5, at: 3, interval: 8, repeats: 2 }, shape: { kind: "ring", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [20, 36], size: [0.2, 0.3],
                    color: 0x8A5A44, alpha: [0.26, 0], light: "world"
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:ability_flamebody", 1, FlameBodyDefinition);
