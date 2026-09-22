/**
 * Client visuals for Early Bird. One morning family: pale gold and sky cyan, thin and quick so
 * the ability reads as "the body clears".
 *
 * Moments:
 *   shrug - one-shot when a hindrance is cut: a pale flash and rising motes off the body.
 *   stir  - one-shot when sleep starts to break: sleep z's thin out and a cyan spark appears.
 *   wake  - one-shot on waking: a bright exclamation and a quick spark climb.
 *   alert - a low engaged aura: a thin ring and spark at the feet.
 *
 * All moments bind `target`; the pulse and tick hooks run with the holder as the source.
 */
const EarlyBirdDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // Shrug: a pale clear-flash and motes lifting off.
        shrug: {
            duration: 28,
            exit: { stop: 10, drain: 24 },
            emitters: [
                {
                    name: "clear_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [8, 14], size: [0.24, 0.03], sizeMode: "index",
                    color: 0xFFE8A8, alpha: [0.9, 0], light: "full", bloom: 0.25
                },
                {
                    name: "lift_mote", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [12, 24], size: [0.06, 0.01],
                    color: 0xCDEEF6, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        // Stir: the z's thin out as sleep halves.
        stir: {
            duration: 34,
            exit: { stop: 14, drain: 30 },
            emitters: [
                {
                    name: "zzz", bind: "target", offset: [0, 0.5, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    burst: { count: 4, interval: 6, repeats: 3 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06], spin: 8,
                    lifetime: [18, 30], size: [0.3, 0.12], sizeMode: "sin",
                    alpha: [0.6, 0], light: "full", maxParticles: 14
                },
                {
                    name: "stir_spark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 6, at: 4 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xB6E8F6, alpha: [0.85, 0], light: "full", maxParticles: 12
                }
            ]
        },
        // Wake: a bright alert mark and a spark climb.
        wake: {
            duration: 32,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "alert_mark", bind: "target", offset: [0, 0.45, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/exclamation",
                    burst: { count: 1, at: 1 }, shape: { kind: "point" },
                    direction: "up", speed: [0.02, 0.04],
                    lifetime: 20, size: [0.4, 0.2], sizeMode: "sin",
                    color: 0xFFE38A, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 2
                },
                {
                    name: "wake_spark", bind: "target", offset: [0, 0.05, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.05, 0.12],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xFFEDB0, alpha: [0.9, 0], light: "full", maxParticles: 20
                }
            ]
        },
        // Alert: a thin ring and a spark at the feet while engaged.
        alert: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "alert_ring", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.44 },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [26, 40], size: [0.4, 0.5], sizeMode: "sin",
                    color: 0xCDEEF6, alpha: [0.16, 0.05], alphaMode: "sin",
                    light: "world", maxParticles: 10
                },
                {
                    name: "alert_spark", bind: "target", offset: [0, 0.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 34], size: [0.05, 0.01],
                    color: 0xFFE8A8, alpha: [0.4, 0], light: "full", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:ability_earlybird", 1, EarlyBirdDefinition);
