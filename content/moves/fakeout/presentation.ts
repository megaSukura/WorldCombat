const FakeoutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        opening: {
            duration: 1200000, exit: { stop: 0, drain: 6 },
            emitters: [{ name: "entry_cue", bind: "source", height: 0.55,
                particle: "world_combat_core:cobblemon/generic/hollowfist", rate: 2,
                shape: { kind: "ring", radius: 0.24, rotation: [90, 0, 0] },
                speed: 0, lifetime: 10, size: [0.13, 0.07], alpha: [0.5, 0], color: 0xFFE9A8,
                light: "world", maxParticles: 3 }]
        },
        ready: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 18, shape: { kind: "ring", radius: 0.32, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0xFFE9A8, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "palm", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 10, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.07, 0.02],
                    color: 0xFFF6DC, alpha: [0.55, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        clap: {
            duration: 10, exit: { stop: 3, drain: 6 },
            emitters: [
                { name: "left_palm", bind: "point", orient: "direction", offset: [-0.3, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/hollowfist", burst: { count: 1 },
                    shape: { kind: "point" }, direction: [1, 0, 0], speed: 0.1, lifetime: 3,
                    size: [0.24, 0.2], alpha: [0.9, 0], color: 0xFFE9A8, light: "full" },
                { name: "right_palm", bind: "point", orient: "direction", offset: [0.3, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/hollowfist", burst: { count: 1 },
                    shape: { kind: "point" }, direction: [-1, 0, 0], speed: 0.1, lifetime: 3,
                    size: [0.24, 0.2], alpha: [0.9, 0], color: 0xFFE9A8, light: "full" },
                { name: "contact", bind: "point", particle: "world_combat_core:cobblemon/generic/hit_yellow",
                    burst: { count: { data: "landed", fallback: 0 }, at: 3 }, shape: { kind: "point" },
                    speed: 0, lifetime: 5, size: [0.28, 0.08], alpha: [1, 0], color: 0xFFF6DC, light: "full" }
            ]
        },
        daze: {
            duration: { data: "daze", fallback: 20 },
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "stars", bind: "target", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "stars", fallback: 6 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.02, 0.06], spread: 12,
                    lifetime: [11, 17], size: [0.13, 0.04],
                    color: 0xFFF2C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 26
                }
            ]
        },
        whiff: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "swish", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "shape", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.2, 0.05],
                    color: 0xEAD7A0, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.12],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xC9B98A, alpha: [0.45, 0], light: "world", maxParticles: 48
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fakeout", 1, FakeoutDefinition);
