/**
 * Particle language for Intrepid Sword. The holder draws a blade when a fight begins: the
 * ability raises Attack for the whole engagement and speeds up skill cooldowns for the
 * opening ten seconds.
 *
 * One steel-blue family carries the sword theme, led by the effect's own 0x4C9BE8: deep blue
 * for the ground wave, cyan and near-white for the blade and the sparks, silver grey for the
 * settling dust. The holder owns the ability, so every moment reads from the holder outward
 * and binds `source`; the server triggers all three from the holder's own hooks.
 *   draw  - combat starts: a ground shockwave, a stand of swords, a steel flash and sparks.
 *   edge  - the quiet Attack boost for the rest of the fight: a low ring and a few motes.
 *   tempo - the ten seconds of skill haste: short slash flicks and fast sparks around the body.
 */
const IntrepidSwordDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // One-shot on the holder: the moment the blade comes out.
        draw: {
            duration: 44,
            exit: { stop: 20, drain: 30 },
            emitters: [
                {
                    name: "shock_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 70 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.12, 0.2],
                    lifetime: [14, 20], size: [0.5, 0.85],
                    color: 0x2C5A96, alpha: [0.5, 0], light: "full", maxParticles: 90
                },
                {
                    name: "blade_rise", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/moves/swordsdance_swords",
                    burst: { count: 4, at: 2 },
                    shape: { kind: "ring", radius: 0.38 },
                    direction: "up", speed: [0.14, 0.26],
                    lifetime: [26, 36], size: [0.4, 0.95],
                    color: 0xE8F5FF, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "blade_flash", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 12, at: 3 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xE8F5FF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "shards", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 40, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.26], spread: 25,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0x9FD8FF, alpha: [0.95, 0], light: "full", maxParticles: 160
                },
                {
                    name: "settle_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    start: 6, rate: 14,
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [24, 42], size: [0.07, 0.02],
                    color: 0x9FB4C8, alpha: [0.28, 0], light: "world", maxParticles: 60
                }
            ]
        },
        // Persistent while the holder stays engaged; renewed by the pulse hook every 20 ticks.
        // The Attack boost itself is already in the stat display, so this stays low and quiet.
        edge: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "foot_ring", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [34, 50], size: [0.42, 0.5], sizeMode: "sin",
                    color: 0x4C9BE8, alpha: [0.16, 0.06], alphaMode: "sin",
                    light: "full", maxParticles: 12
                },
                {
                    name: "edge_mote", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [24, 40], size: [0.05, 0.01],
                    color: 0x9FD8FF, alpha: [0.4, 0], light: "full", maxParticles: 18
                },
                {
                    name: "sheen", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 2, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.02],
                    lifetime: [26, 38], size: [0.12, 0.04], sizeMode: "sin",
                    color: 0xBFE0FF, alpha: [0.22, 0], light: "full", maxParticles: 10
                }
            ]
        },
        // Persistent for the ten seconds of skill haste; renewed from the effect tick. The flicks
        // are rate-driven so the scene survives any number of renewals without running dry.
        tempo: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "flick", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/slash",
                    rate: 3, shape: { kind: "sphere", radius: 0.25 },
                    direction: "shape", speed: [0.05, 0.15],
                    roll: [0, 300],
                    lifetime: [6, 12], size: [0.45, 0.18], sizeMode: "index",
                    color: 0xBFE0FF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 12
                },
                {
                    name: "streak", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/balls/afterspark",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.25], drag: 0.85,
                    lifetime: [7, 14], size: [0.07, 0.01],
                    color: 0x9FD8FF, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "shine", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [16, 26], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0x4C9BE8, alpha: [0.32, 0.06], alphaMode: "sin",
                    light: "full", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_intrepidsword", 1, IntrepidSwordDefinition);
