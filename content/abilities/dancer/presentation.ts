/**
 * Client visuals for Dancer. One rose-violet family: warm rose for the shared rhythm, deeper
 * violet for the distraction, and a bright note accent on the performer.
 *
 * Moments:
 *   dance  - one-shot on the holder: a ribbon of notes lifts and a rose ring sweeps out.
 *   rhythm - one-shot on the holder when allies are caught: the ring brightens and confetti pops.
 *   mesmer - one-shot on each distracted foe: a violet spiral and sinking dust.
 *   step   - one-shot on the holder for the Speed stage: a hot spark climb at the feet.
 *
 * The performer moment binds `target` or `point`; the foe moments bind `target`.
 */
const DancerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // Dance: notes rise, a rose ring sweeps out, the body flashes.
        dance: {
            duration: 44,
            exit: { stop: 16, drain: 36 },
            emitters: [
                {
                    name: "notes", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 6, interval: 3, repeats: 4 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.1], spin: 12,
                    lifetime: [18, 32], size: [0.22, 0.08], sizeMode: "sin",
                    color: 0xF070B0, alpha: [0.9, 0], light: "full", maxParticles: 32
                },
                {
                    name: "sweep", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 26, at: 2 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.16],
                    lifetime: [16, 24], size: [0.4, 0.7],
                    color: 0xF070B0, alpha: [0.65, 0], light: "full"
                },
                {
                    name: "body_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 10, at: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xFFB6D8, alpha: [0.9, 0], light: "full", maxParticles: 22
                }
            ]
        },
        // Rhythm: the shared buff reads as confetti and a widening rose ring.
        rhythm: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "confetti", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: 14, at: 1 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.2], gravity: 0.02, drag: 0.94, spin: 18,
                    lifetime: [16, 28], size: [0.14, 0.04],
                    color: 0xFFCB6B, alpha: [0.95, 0], light: "full", maxParticles: 26
                },
                {
                    name: "wide_ring", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.14, 0.2],
                    lifetime: [16, 24], size: [0.5, 1.0],
                    color: 0xF070B0, alpha: [0.5, 0], light: "full"
                }
            ]
        },
        // Mesmer: a violet spiral and sinking dust on the distracted foe.
        mesmer: {
            duration: 32,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "spiral", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.06], spin: 10,
                    lifetime: [16, 28], size: [0.24, 0.08], sizeMode: "sin",
                    color: 0x9A5FD0, alpha: [0.7, 0], light: "full", maxParticles: 28
                },
                {
                    name: "sink_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "down", speed: [0.03, 0.09], gravity: 0.02, drag: 0.95,
                    lifetime: [14, 24], size: [0.06, 0.02],
                    color: 0x5B3B8C, alpha: [0.55, 0], light: "world", maxParticles: 24
                }
            ]
        },
        // Step: the native Speed stage climbs.
        step: {
            duration: 28,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "step_spark", bind: "target", offset: [0, 0.05, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.04, 0.1],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0xFF9AD0, alpha: [0.85, 0], light: "full", maxParticles: 18
                },
                {
                    name: "step_ring", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 2 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [18, 28], size: [0.4, 0.6], sizeMode: "sin",
                    color: 0xF070B0, alpha: [0.4, 0], light: "full", maxParticles: 4
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_dancer", 1, DancerDefinition);
