/**
 * Test fixture: three moments that exercise the emitter, shape, burst, child, velocity-expression,
 * collision and trail capabilities on top of MadParticle. Every emitter uses Cobblemon particle
 * textures except one vanilla type, so a missing texture or GL prerequisite is visible here.
 */
const ParticleSampleDefinition: ParticleDefinition = {
    moments: {
        // Continuous: slow orbiting lights bound to the source, plus micro dust rising at the feet.
        main: {
            emitters: [
                {
                    name: "orbit_cyan", bind: "source", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 12, shape: { kind: "ring", radius: 0.85 },
                    direction: "shape", speed: [0.01, 0.03],
                    velocity: { x: "-0.05*sin(6.2832*t)", z: "0.05*cos(6.2832*t)" },
                    lifetime: [30, 55], size: [0.12, 0.05], sizeMode: "sin",
                    color: 0x66CCFF, alpha: [0.9, 0], alphaMode: "sin", spin: 60, light: "full"
                },
                {
                    name: "orbit_pink", bind: "source", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 8, shape: { kind: "ring", radius: 0.7, rotation: [0, 90, 0] },
                    direction: "shape", speed: [0.01, 0.03],
                    velocity: { x: "0.06*cos(6.2832*t)", z: "0.06*sin(6.2832*t)" },
                    lifetime: [28, 48], size: [0.10, 0.04], sizeMode: "sin",
                    color: 0xFF88CC, alpha: [0.9, 0], alphaMode: "sin", spin: -50, light: "full"
                },
                {
                    name: "foot_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.55 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [24, 48], size: [0.08, 0.02],
                    color: 0xAAE8FF, alpha: [0.7, 0], light: "full"
                },
                {
                    name: "foot_spark", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "minecraft:end_rod",
                    rate: 6, shape: { kind: "ring", radius: 0.75 },
                    direction: "up", speed: [0.03, 0.08],
                    lifetime: [18, 36], size: [0.06, 0.02], alpha: [0.6, 0], light: "full"
                }
            ]
        },
        // One-shot: core burst with a death child, an exp4j spiral, and bouncing debris.
        impact: {
            duration: 45, exit: { stop: 8, drain: 40 },
            emitters: [
                {
                    name: "burst_core", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.18, thickness: 1 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [8, 14], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xCCFFFF, alpha: [1, 0], light: "full",
                    child: {
                        particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                        lifetime: 14, size: [0.22, 0], alpha: [0.5, 0], color: 0x88AACC, spin: 30
                    }
                },
                {
                    name: "burst_spiral", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    burst: { count: 16, repeats: 3, interval: 2 },
                    shape: { kind: "sphere_surface", radius: 0.1 },
                    velocity: { x: "-0.22*sin(6.2832*t)", y: "0.10-0.18*t", z: "0.22*cos(6.2832*t)" },
                    lifetime: [16, 26], size: [0.16, 0.02],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", maxParticles: 96
                },
                {
                    name: "debris", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 14, at: 2 }, shape: { kind: "box", size: [0.3, 0.15, 0.3] },
                    direction: "shape", speed: [0.1, 0.28], spread: 45,
                    gravity: 0.05, drag: 0.99,
                    lifetime: [30, 50], size: [0.14, 0.10], alpha: [1, 0],
                    collision: { bounces: 2, horizontalSpread: 0.5, verticalBounce: 0.4, dragAfter: 0.8, gravityAfter: 0.05 }
                }
            ]
        },
        // Trail: emission follows the source's recorded path instead of its live position.
        trail: {
            emitters: [
                {
                    name: "ember_trail", bind: "source", offset: [0, 0.6, 0],
                    trail: { minDistance: 0.35 },
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 20, direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 34], size: [0.14, 0.02], color: 0xFFAA55, alpha: [0.9, 0], light: "full"
                },
                {
                    name: "smoke_trail", bind: "source", offset: [0, 0.35, 0],
                    trail: { minDistance: 0.6 },
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    rate: 10, direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 40], size: [0.2, 0.05], color: 0x99DDFF, alpha: [0.5, 0], light: "full"
                },
                {
                    name: "flame_trail", bind: "source", offset: [0, 0.9, 0],
                    trail: { minDistance: 0.9 },
                    particle: "minecraft:flame",
                    rate: 8, lifetime: [12, 20], size: [0.1, 0.02], alpha: [0.8, 0], light: "full"
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("checks:particle_sample", 1, ParticleSampleDefinition);
