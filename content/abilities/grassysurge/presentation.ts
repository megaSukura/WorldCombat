/**
 * Client visuals for Grassy Surge. The ability opens a field, keeps it for one engagement and
 * answers two local events: a friendly body healed on the field and a plant ripened by it.
 *
 * One hue family: the ability green (0x7CCB5A) darkened for the ground, lightened for the detail
 * layers and lifted to a near-white only on the small emphasis sprites. The persistent `field`
 * layers sit at foot height, stay sparse and low-alpha, and let the fight read through them.
 */
const GrassySurgeDefinition: ParticleDefinition = {
    moments: {
        // Rise: a boundary wave runs out to the field edge while leaves break ground behind it.
        rise: {
            duration: 50,
            exit: { stop: 16, drain: 40 },
            emitters: [
                {
                    name: "wave", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 40, at: 1 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.14, 0.20],
                    lifetime: [22, 34], size: [0.12, 0.02],
                    color: 0x9FE07A, alpha: [0.85, 0], light: "full", maxParticles: 80
                },
                {
                    name: "leaves", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 30, repeats: 2, interval: 5 },
                    shape: { kind: "circle", radius: 4.7, thickness: 0.9 },
                    direction: "up", speed: [0.05, 0.10], gravity: 0.018, drag: 0.96,
                    lifetime: [26, 44], size: [0.24, 0.10],
                    color: 0x86C96A, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "bits", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 70, repeats: 3, interval: 3 },
                    shape: { kind: "circle", radius: 3.6 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 24], size: [0.06, 0.01],
                    color: 0xDCF3BE, alpha: [0.55, 0], light: "full", maxParticles: 220
                },
                {
                    name: "flare", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 5, at: 1 }, shape: { kind: "sphere", radius: 0.25 },
                    direction: "up", speed: [0.10, 0.16],
                    lifetime: [16, 26], size: [0.38, 0.12],
                    color: 0xEDF8DC, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 10
                }
            ]
        },
        // Field: the persistent read. A dotted grass edge, a slow 2 s breath, a few ground motes.
        field: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "edge", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 10, shape: { kind: "circle", radius: 4.7, thickness: 0.9 },
                    direction: "up", speed: [0.005, 0.02], spin: 8,
                    lifetime: [40, 70], size: [0.14, 0.04],
                    color: 0x8FCF6E, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 50
                },
                {
                    name: "breathe", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    burst: { count: 16, interval: 40, repeats: 15, at: 25 },
                    shape: { kind: "ring", radius: 4.9 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [26, 44], size: [0.11, 0.02],
                    color: 0xB9E890, alpha: [0.45, 0], light: "full", maxParticles: 40
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "circle", radius: 4.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [30, 55], size: [0.05, 0.01],
                    color: 0xDCEFBF, alpha: [0.14, 0], light: "full", maxParticles: 30
                }
            ]
        },
        // Heal: light gathers up the ally's body and flashes once at the chest.
        heal: {
            duration: 34,
            exit: { stop: 8, drain: 30 },
            emitters: [
                {
                    name: "uptake", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.07],
                    lifetime: [16, 28], size: [0.12, 0.02],
                    color: 0xA9E87A, alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "sparks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 18, at: 2 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.05, 0.12],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xD8F5A8, alpha: [1, 0], light: "full", maxParticles: 30
                },
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: 12, size: [0.30, 0.05], sizeMode: "index",
                    color: 0xEAF9D5, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 6
                }
            ]
        },
        // Growth: bone-meal sparkle falls onto the plant and one sprout answers upward.
        growth: {
            duration: 34,
            exit: { stop: 10, drain: 32 },
            emitters: [
                {
                    name: "sprinkle", bind: "point", offset: [0, 0.9, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: 20 }, shape: { kind: "circle", radius: 0.4 },
                    direction: "down", speed: [0.06, 0.12],
                    lifetime: [14, 26], size: [0.10, 0.02],
                    color: 0xB6E88A, alpha: [0.9, 0], light: "full", maxParticles: 30
                },
                {
                    name: "lift", bind: "point", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 3, at: 3 }, shape: { kind: "sphere", radius: 0.15 },
                    direction: "up", speed: [0.05, 0.10],
                    lifetime: [18, 30], size: [0.26, 0.10],
                    color: 0x8FCF6E, alpha: [1, 0], light: "full", maxParticles: 6
                },
                {
                    name: "base", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xDCF3BE, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:ability_grassysurge", 1, GrassySurgeDefinition);
