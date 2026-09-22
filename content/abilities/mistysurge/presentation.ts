/**
 * Client visuals for Misty Surge. The ability opens a purifying mist where the holder first meets
 * an enemy, keeps it for one engagement and answers two local events: a friendly body washed clean
 * and a native status turned away by the ground ward.
 *
 * One hue family: the terrain effect's own pale cyan (0xA8D8E8), deepened for the ground bank,
 * lightened for the mist edge and lifted to near-white only on the small emphasis sprites. A dark
 * blue-grey neutral carries the impurities washed out of a cleansed body. The persistent `field`
 * layers hug the ground, stay sparse and low-alpha so the fight reads through them.
 */
const MistySurgeDefinition: ParticleDefinition = {
    moments: {
        // Rise: a boundary wave runs out to the field edge while the mist bank rolls out and fills.
        rise: {
            duration: 50,
            exit: { stop: 26, drain: 34 },
            emitters: [
                {
                    name: "wave", bind: "point", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 46, at: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.15, 0.22], spread: 3,
                    lifetime: [26, 40], size: [0.12, 0.02],
                    color: 0xC8EAF2, alpha: [0.75, 0], light: "full", maxParticles: 90
                },
                {
                    name: "bank", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 54, interval: 4, repeats: 3 },
                    shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.008, 0.025],
                    lifetime: [40, 70], size: [0.40, 0.14],
                    color: 0xBFE0EA, alpha: [0.28, 0], light: "world", maxParticles: 220
                },
                {
                    name: "puffs", bind: "point", offset: [0, 0.10, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    burst: { count: 20, at: 2, interval: 6, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.55 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [30, 52], size: [0.42, 0.18],
                    color: 0xD6EEF4, alpha: [0.30, 0], light: "world", maxParticles: 60
                },
                {
                    name: "glints", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 80, interval: 3, repeats: 4 },
                    shape: { kind: "circle", radius: 4.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 24], size: [0.07, 0.01],
                    color: 0xEAF7FA, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 380
                },
                {
                    name: "crest", bind: "point", offset: [0, 0.25, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 4, at: 1 }, shape: { kind: "sphere", radius: 0.30 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: 12, size: [0.34, 0.06], sizeMode: "index",
                    color: 0xF6FCFE, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 8
                }
            ]
        },
        // Field: the persistent read. A dotted mist edge, a slow 2 s breath, a low ground bank.
        field: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 9, shape: { kind: "circle", radius: 4.7, thickness: 0.9 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [40, 70], size: [0.13, 0.04],
                    color: 0x9FD4E2, alpha: [0.20, 0], alphaMode: "sin", light: "full", maxParticles: 45
                },
                {
                    name: "bank", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 6, shape: { kind: "circle", radius: 3.8 },
                    direction: "up", speed: [0.008, 0.025],
                    lifetime: [45, 75], size: [0.34, 0.12],
                    color: 0xC2E2EC, alpha: [0.12, 0], alphaMode: "sin", light: "world", maxParticles: 45
                },
                {
                    name: "breathe", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    burst: { count: 14, interval: 40, repeats: 15, at: 25 },
                    shape: { kind: "ring", radius: 4.9 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [26, 44], size: [0.10, 0.02],
                    color: 0xDCF2F7, alpha: [0.40, 0], light: "full", maxParticles: 30
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "circle", radius: 4.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [30, 55], size: [0.05, 0.01],
                    color: 0xE4F5F8, alpha: [0.12, 0], light: "full", maxParticles: 24
                }
            ]
        },
        // Cleanse: mist gathers up the ally's body, dark impurities lift away, a water ring washes out.
        cleanse: {
            duration: 34,
            exit: { stop: 14, drain: 26 },
            emitters: [
                {
                    name: "wash", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.03, 0.07],
                    lifetime: [16, 28], size: [0.12, 0.02],
                    color: 0xA8D8E8, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "ripple", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/ripple_white",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.04, 0.07],
                    lifetime: [12, 18], size: [0.30, 0.12],
                    color: 0xBFE4EE, alpha: [0.5, 0], light: "full", maxParticles: 16
                },
                {
                    name: "lift", bind: "target", offset: [0, 0.30, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6, at: 1 }, shape: { kind: "sphere", radius: 0.30 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [18, 30], size: [0.22, 0.09],
                    color: 0xCDE9F0, alpha: [0.26, 0], light: "world", maxParticles: 12
                },
                {
                    name: "impurity", bind: "target", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "up", speed: [0.04, 0.11], drag: 0.94,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x3E5058, alpha: [0.55, 0], light: "world", maxParticles: 26
                },
                {
                    name: "sparks", bind: "target", offset: [0, 0.30, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 8, at: 2 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.05, 0.12],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xF6FCFE, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 12
                }
            ]
        },
        // Ward: a soft mist wall closes around the body and turns the incoming condition away.
        ward: {
            duration: 28,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.04, 0.08],
                    lifetime: [12, 18], size: [0.34, 0.14],
                    color: 0x9FD4E2, alpha: [0.5, 0], light: "full", maxParticles: 30
                },
                {
                    name: "veil", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [16, 28], size: [0.30, 0.12],
                    color: 0xC6E5EE, alpha: [0.28, 0], light: "world", maxParticles: 16
                },
                {
                    name: "glints", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 12, at: 1 }, shape: { kind: "sphere_surface", radius: 0.40 },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xEAF7FA, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 18
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:ability_mistysurge", 1, MistySurgeDefinition);
