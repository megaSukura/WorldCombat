/**
 * Client definition for Forewarn.
 *
 * One scene, four moments:
 * - sense:   the holder's mind sweeps the field and opens a violet mind's eye,
 * - mark:    the premonition clamps onto the strongest foe it chose,
 * - seal:    the foe's strongest move is locked away (Pokemon layer only),
 * - sustain: a sparse dream haze while world_combat:forewarn_mark holds on the victim.
 *
 * The colour family is the effect's own violet (0x7A5FBF): deep indigo for shadow and ground,
 * mid violet for the outline, pale lilac for detail, and near-white only on the small emphasis
 * core. Textures and frame sizes come from particle_types.txt.
 */
const ForewarnDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // One-shot on the holder: a warbling psychic band sweeps out to the read radius, a spiral
        // mind's eye turns overhead, dream specks scatter and a pale flash marks the insight.
        sense: {
            duration: 52,
            exit: { stop: 24, drain: 32 },
            emitters: [
                {
                    name: "scan_ring", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 170 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.6, 0.72], spread: 2,
                    lifetime: [22, 28], size: [0.45, 0.9],
                    color: 0x6A4FB0, alpha: [0.5, 0], light: "full"
                },
                {
                    name: "mind_eye", bind: "source", offset: [0, 0.2, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 5, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.005, 0.02], spin: 6,
                    lifetime: [20, 28], size: [0.3, 0.16], sizeMode: "sin",
                    color: 0x9A7AD8, alpha: [0.7, 0], alphaMode: "sin",
                    light: "full", bloom: 0.25, maxParticles: 10
                },
                {
                    name: "thought_motes", bind: "source", offset: [0, 0.15, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 40, repeats: 2, interval: 4 },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.1, 0.42], spread: 12,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0xC3ABF0, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 110
                },
                {
                    name: "dream_wisps", bind: "source", offset: [0, 0.05, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 36], size: [0.16, 0.03],
                    color: 0x8E75C8, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "core_flash", bind: "source", offset: [0, 0.2, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: 3, at: 3 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: 12, size: [0.35, 0.05], sizeMode: "index",
                    color: 0xE6DEFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 6
                }
            ]
        },
        // One-shot on the chosen foe: a violet seal contracts onto the body, a psychic impact
        // flashes, a dream star brands the head and dark dust settles.
        mark: {
            duration: 30,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "seal_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 30 },
                    shape: { kind: "ring", radius: 1.3 },
                    direction: "inward", speed: [0.06, 0.09],
                    lifetime: [12, 16], size: [0.45, 0.16],
                    color: 0x6A4FB0, alpha: [0.55, 0], light: "full"
                },
                {
                    name: "mark_hit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [7, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xE6DEFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "dream_star", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.01, 0.03], spin: 10,
                    lifetime: 20, size: [0.35, 0.12], sizeMode: "index",
                    color: 0xE6DEFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 2
                },
                {
                    name: "dream_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.1],
                    gravity: 0.02, drag: 0.95,
                    lifetime: [14, 22], size: [0.07, 0.02],
                    color: 0x4A3A78, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        // One-shot on the foe if it is a Pokemon: the strongest move is caught. A violet lock
        // ring closes in while crossed swords flare overhead and pale specks are drawn in.
        seal: {
            duration: 28,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "forbid_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.09],
                    lifetime: [12, 20], size: [0.4, 0.16],
                    color: 0x6A4FB0, alpha: [0.6, 0], light: "full"
                },
                {
                    name: "swords", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/crossedswords",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 0.1 },
                    direction: "up", speed: [0.01, 0.03], spin: 12,
                    lifetime: 22, size: [0.5, 0.18], sizeMode: "sin",
                    color: 0xC3ABF0, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 2
                },
                {
                    name: "lock_dust", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xE6DEFF, alpha: [0.9, 0], light: "full", maxParticles: 22
                }
            ]
        },
        // Continuous while the mark lasts; renewed every 20 ticks. Kept low and off the sight
        // line: a breathing orb above the head and dream dust turning at the feet.
        sustain: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "eye_crest", bind: "target", offset: [0, 0.2, 0], height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [24, 32], size: [0.16, 0.06], sizeMode: "sin",
                    color: 0x7A5FBF, alpha: [0.38, 0], alphaMode: "sin",
                    light: "full", maxParticles: 14
                },
                {
                    name: "thought_motes", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [24, 40], size: [0.06, 0.02],
                    color: 0x9A7AD8, alpha: [0.3, 0], light: "full", maxParticles: 20
                },
                {
                    name: "dream_ring", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 2, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [30, 42], size: [0.4, 0.5], sizeMode: "sin",
                    color: 0x5A4A8C, alpha: [0.14, 0.05], alphaMode: "sin",
                    light: "world", maxParticles: 10
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_forewarn", 1, ForewarnDefinition);
