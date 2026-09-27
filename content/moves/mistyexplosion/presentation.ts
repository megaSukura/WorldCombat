const MistyexplosionDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        swell: {
            duration: { data: "windup", fallback: 16 },
            exit: { drain: 14 },
            emitters: [
                {
                    name: "gather_mist", bind: "source", offset: [0, 0.7, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                    rate: 24, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [10, 18], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFC6E2, alpha: [0.6, 0], light: "world", maxParticles: 130
                },
                {
                    name: "body_glow", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFE0F0, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 70
                }
            ]
        },
        bloom: {
            duration: 36,
            exit: { stop: 22, drain: 26 },
            emitters: [
                {
                    name: "mist_ring", bind: "point", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                    burst: { count: { data: "count", fallback: 90 }, interval: 2, repeats: 1 },
                    shape: { kind: "circle", radius: 4.4 },
                    direction: "outward", speed: [0.08, 0.4],
                    lifetime: [14, 26], size: [0.5, 0.1], sizeMode: "index",
                    color: 0xFFB6DC, alpha: [0.55, 0], gravity: -0.005, drag: 0.94, light: "world", maxParticles: 420
                },
                {
                    name: "impact", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "sphere", radius: 4.4 },
                    direction: "shape", speed: [0.06, 0.28],
                    lifetime: [8, 14], size: [0.45, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 120
                },
                {
                    name: "shimmer", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "count", fallback: 60 }, interval: 3, repeats: 1 },
                    shape: { kind: "circle", radius: 4.4 },
                    direction: "up", speed: [0.04, 0.22],
                    lifetime: [14, 26], size: [0.16, 0.02],
                    color: 0xFFE8F6, alpha: [0.9, 0], gravity: -0.01, light: "full", bloom: 0.6, maxParticles: 280
                },
                {
                    name: "gold", bind: "point", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "gold", fallback: 0 }, interval: 4, repeats: 1 },
                    shape: { kind: "circle", radius: 4.4 },
                    direction: "up", speed: [0.05, 0.25],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xFFF0B0, alpha: [0.85, 0], light: "full", maxParticles: 200
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 7, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.4, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.7
                },
                {
                    name: "motes", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "count", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.35],
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xFFE0F0, alpha: [0.9, 0], light: "full"
                }
            ]
        },
        haze: {
            exit: { drain: 12 },
            emitters: [{
                name: "aim_mist", bind: "target", height: .85, fit: "body",
                particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                rate: 4, shape: { kind: "sphere_surface", radius: .15 }, direction: "up",
                speed: [.004, .018], lifetime: [8, 14], size: [.13, .03],
                color: 0xF0A8D0, alpha: [.3, 0], light: "world", maxParticles: 12
            }]
        },
        mist: {
            duration: { data: "ticks", fallback: 50 },
            exit: { drain: 26 },
            emitters: [
                {
                    name: "lost_mist", bind: "point", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 8,
                    shape: { kind: "circle", radius: 3.6 },
                    direction: "outward", speed: [0.01, 0.06],
                    lifetime: [16, 30], size: [0.4, 0.7],
                    color: 0xE8B6D0, alpha: [0.3, 0], light: "world", maxParticles: 160
                },
                {
                    name: "drifting", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 10, at: 0, interval: 6, repeats: 2 },
                    shape: { kind: "circle", radius: 3.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.08, 0.02],
                    color: 0xFFD7EE, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mistyexplosion", 1, MistyexplosionDefinition);
