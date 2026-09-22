/**
 * Client visuals for Levitate. One pale-cyan family: a light updraft under the body and a thin
 * sky ring, with a white snap when a grounded hit is turned away.
 *
 * Moments:
 *   hover  - engaged aura: a soft updraft, a slow sky ring at the knees and drifting motes.
 *   negate - one-shot on the holder when a Ground move or ground hazard is negated: a white ring
 *            and a quick updraft gust.
 *   drift  - one-shot on the holder when a grounded melee is reduced: a small sideways slip.
 *
 * All moments bind `target`, because the incoming-damage event source is the attacker.
 */
const LevitateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // Hover: updraft, slow ring, drifting motes, all low and translucent.
        hover: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "updraft", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 5, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.02, 0.06], spin: 6,
                    lifetime: [24, 40], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0xAFE8FF, alpha: [0.32, 0], light: "full", maxParticles: 20
                },
                {
                    name: "sky_ring", bind: "target", offset: [0, 0.22, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 3, shape: { kind: "ring", radius: 0.44 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [28, 42], size: [0.4, 0.54], sizeMode: "sin",
                    color: 0xCDEEF6, alpha: [0.2, 0.06], alphaMode: "sin",
                    light: "world", maxParticles: 10
                },
                {
                    name: "drift_mote", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [24, 40], size: [0.05, 0.01],
                    color: 0xDCF4FF, alpha: [0.35, 0], light: "full", maxParticles: 14
                }
            ]
        },
        // Negate: a white snap and a quick gust.
        negate: {
            duration: 30,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "snap_ring", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 2, at: 1, interval: 2 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.18],
                    lifetime: [12, 20], size: [0.44, 0.9],
                    color: 0xE8F8FF, alpha: [0.7, 0], light: "full", maxParticles: 5
                },
                {
                    name: "gust", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    burst: { count: 8, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xDCF4FF, alpha: [0.8, 0], light: "full", maxParticles: 14
                }
            ]
        },
        // Drift: a small sideways slip.
        drift: {
            duration: 24,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "slip", bind: "target", offset: [0, 0.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 20], size: [0.06, 0.01],
                    color: 0xCDEEF6, alpha: [0.6, 0], light: "full", maxParticles: 16
                },
                {
                    name: "slip_orb", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 4 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 26], size: [0.1, 0.03], sizeMode: "sin",
                    color: 0xAFE8FF, alpha: [0.5, 0], light: "full", maxParticles: 8
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_levitate", 1, LevitateDefinition);
