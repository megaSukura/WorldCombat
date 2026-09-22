/**
 * Particle language for Hospitality. One warm amber family (the well-fed effect colour 0xE8A86B)
 * over a toasted-brown neutral, with cream highlights only on the smallest accents.
 *
 * The holder sets a meal down, so the moments read from the ground up:
 *   offer - first contact: a warm ring spreads, the meal flashes into place and steams.
 *   meal  - while the meal waits: sparse warmth at its base and thin rising steam.
 *   feed  - an ally reaches it: light rises into the body, a heart and a soft flash.
 *   pp    - the fed Pokemon recovers PP: a small cream sparkle at its side.
 *   spoil - the meal is gone: crumbs and a thin curl of smoke where it stood.
 *
 * `offer`, `meal` and `spoil` bind `point` (the meal is a world object); `feed` and `pp` bind
 * `target` so they follow the ally that was served. Frame sizes come from particle_types.txt.
 */
const HospitalityDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // One-shot at the meal: a warm boundary ring, the summon flash and the first steam.
        offer: {
            duration: 40,
            exit: { stop: 18, drain: 30 },
            emitters: [
                {
                    name: "ground_ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.09],
                    lifetime: [18, 26], size: [0.36, 0.62],
                    color: 0xE8A86B, alpha: [0.6, 0], light: "full"
                },
                {
                    name: "summon_flash", bind: "point", offset: [0, 0.16, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 4, at: 1 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [14, 20], size: [0.34, 0.08], sizeMode: "index",
                    color: 0xFFF0D0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "warm_motes", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 20, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.04, 0.1],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0xFFD39A, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "first_steam", bind: "point", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6, at: 4 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [18, 30], size: [0.2, 0.34],
                    color: 0xD8B48A, alpha: [0.28, 0], light: "world"
                }
            ]
        },
        // Continuous while the meal waits; renewed every 10 ticks while the helper lives.
        meal: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "meal_ring", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3,
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0, 0.01],
                    lifetime: [26, 40], size: [0.3, 0.42], sizeMode: "sin",
                    color: 0xE8A86B, alpha: [0.2, 0.06], alphaMode: "sin",
                    light: "world", maxParticles: 8
                },
                {
                    name: "meal_glow", bind: "point", offset: [0, 0.14, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4,
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 30], size: [0.14, 0.05], sizeMode: "sin",
                    color: 0xFFD39A, alpha: [0.4, 0], alphaMode: "sin",
                    light: "full", maxParticles: 12
                },
                {
                    name: "meal_steam", bind: "point", offset: [0, 0.32, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 3,
                    shape: { kind: "point" },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 36], size: [0.18, 0.3],
                    color: 0xD8B48A, alpha: [0.22, 0], light: "world", maxParticles: 14
                }
            ]
        },
        // One-shot on each served ally.
        feed: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "uptake", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.08],
                    lifetime: [16, 28], size: [0.12, 0.02],
                    color: 0xFFD39A, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "heart", bind: "target", offset: [0, 0.1, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 3, at: 3 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 24], size: [0.26, 0.1], sizeMode: "sin",
                    color: 0xFFB98A, alpha: [0.85, 0], alphaMode: "sin",
                    light: "full", maxParticles: 6
                },
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 3 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: 12, size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFF0D0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "crumbs", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    gravity: 0.03, drag: 0.95,
                    lifetime: [14, 24], size: [0.06, 0.01],
                    color: 0xE8C9A0, alpha: [0.6, 0], light: "world", maxParticles: 20
                }
            ]
        },
        // Pokemon-only: the lowest-PP move gets one point back.
        pp: {
            duration: 26,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "pp_spark", bind: "target", offset: [0, 0.08, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.08],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0xFFE2B8, alpha: [0.95, 0], light: "full", maxParticles: 24
                },
                {
                    name: "pp_orb", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 2, at: 2 },
                    shape: { kind: "sphere", radius: 0.15 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.14, 0.04], sizeMode: "index",
                    color: 0xFFF0D0, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 6
                }
            ]
        },
        // One-shot when the meal is destroyed or expires with nobody left to serve.
        spoil: {
            duration: 30,
            exit: { stop: 10, drain: 26 },
            emitters: [
                {
                    name: "spoil_crumbs", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "down", speed: [0.03, 0.09],
                    gravity: 0.03, drag: 0.94,
                    lifetime: [14, 24], size: [0.06, 0.02],
                    color: 0xB98A5A, alpha: [0.55, 0], light: "world", maxParticles: 20
                },
                {
                    name: "spoil_smoke", bind: "point", offset: [0, 0.16, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 4 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 30], size: [0.2, 0.3],
                    color: 0x8A6A50, alpha: [0.22, 0], light: "world"
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_hospitality", 1, HospitalityDefinition);
