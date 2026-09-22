/**
 * Client definition for Intimidate.
 *
 * One scene, three moments:
 * - release: the menacing wave that leaves the holder and reads the 12-block reach,
 * - mark: the dark seal clamped onto each enemy that first closes in,
 * - sustain: a sparse reminder while world_combat:intimidate_mark holds on a victim.
 *
 * The colour family is the effect's own crimson (0xB03030) with near-black neutrals; the hot
 * coral core is the only saturated accent. Textures and frame sizes come from particle_types.txt.
 */
const IntimidateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // One-shot on the ability holder: a soft crimson band sweeps out to the effect radius, a hot
        // core snaps at the holder, anger marks flare overhead and dark smoke lingers at the feet.
        release: {
            duration: 46,
            exit: { stop: 22, drain: 30 },
            emitters: [
                {
                    name: "shock_ring", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 170 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.55, 0.62], spread: 2,
                    lifetime: [20, 25], size: [0.5, 0.85],
                    color: 0x8E1B1B, alpha: [0.5, 0], light: "full"
                },
                {
                    name: "ring_glints", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 70, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.5, 0.72], spread: 4,
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0xFF6A4A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 260
                },
                {
                    name: "core_flash", bind: "point", offset: [0, 0.28, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 18, at: 4 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.42, 0.05], sizeMode: "index",
                    color: 0xFF8A6A, alpha: [1, 0], light: "full", bloom: 0.5,
                    child: {
                        particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                        lifetime: 18, size: [0.3, 0], alpha: [0.35, 0], color: 0x2A0A0A, spin: 20,
                        light: "world"
                    }
                },
                {
                    name: "rage_marks", bind: "point", offset: [0, 1.2, 0],
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: 5, at: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 20], size: [0.32, 0.12], sizeMode: "sin",
                    alpha: [0.85, 0], alphaMode: "sin", light: "full", maxParticles: 16
                },
                {
                    name: "low_smoke", bind: "point", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    start: 6, rate: 12,
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "up", speed: [0.02, 0.05],
                    lifetime: [26, 42], size: [0.35, 0.08],
                    color: 0x2A0A0A, alpha: [0.3, 0], light: "world", maxParticles: 90
                }
            ]
        },
        // One-shot on each intimidated enemy: a dark burst, a crimson ring that contracts onto the
        // body, and dark dust pressed toward the ground.
        mark: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "seal_hit", bind: "target",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [7, 12], size: [0.32, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "seal_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: 0.95 },
                    direction: "inward", speed: [0.055, 0.085],
                    lifetime: [12, 16], size: [0.42, 0.18],
                    color: 0x8E1B1B, alpha: [0.55, 0], light: "full"
                },
                {
                    name: "cower_dust", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 24 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.1],
                    lifetime: [14, 22], size: [0.07, 0.02],
                    color: 0x3A0A0A, alpha: [0.6, 0], gravity: 0.02, drag: 0.95, light: "world",
                    maxParticles: 40
                }
            ]
        },
        // Continuous while the mark lasts; renewed every 20 ticks. Kept low and off the sight line:
        // a soft crest above the head and a few embers at the feet.
        sustain: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "crest", bind: "target", offset: [0, 0.2, 0], height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4,
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [24, 32], size: [0.16, 0.06], sizeMode: "sin",
                    color: 0xB03030, alpha: [0.4, 0], alphaMode: "sin", light: "full",
                    maxParticles: 14
                },
                {
                    name: "feet_ember", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3,
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [24, 40], size: [0.06, 0.02],
                    color: 0xB03030, alpha: [0.32, 0], light: "full",
                    maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_intimidate", 1, IntimidateDefinition);
