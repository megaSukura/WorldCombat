/** A single grant ripple; each recipient carries a quiet star that brightens at a blocked critical. */
const LuckychantDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_star", bind: "source", offset: [0, 1.15, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: 6, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [14, 22], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0xFFF0BF, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 22
                },
                {
                    name: "gather_note", bind: "source", offset: [0, 1.0, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 3, interval: 5, repeats: 2 }, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.18, 0.05],
                    color: 0xFFD26E, alpha: [0.6, 0], light: "full", maxParticles: 12
                }
            ]
        },
        chant: {
            duration: 46,
            exit: { stop: 16, drain: 32 },
            emitters: [
                {
                    name: "chant_ring", bind: "point", fit: "world", height: 0.05, offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 36 }, shape: { kind: "ring", radius: { data: "field", fallback: 3.5 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.36, 0.16],
                    color: 0xFFF0BF, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "chant_stars", bind: "source", offset: [0, 1.1, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: { data: "motes", fallback: 24 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.9,
                    lifetime: [18, 30], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFFD26E, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "chant_sparkle", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 14, interval: 4, repeats: 3 }, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [16, 28], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xFFF0BF, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "chant_dust", bind: "point", fit: "world", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "ring", radius: { data: "field", fallback: 3.5 } },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0xE8C980, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        receive: {
            duration: 20, emitters: [{ name: "receive", bind: "target", height: 1.05,
                particle: "world_combat_core:cobblemon/moves/wish_star", burst: { count: 1 },
                speed: 0, lifetime: 20, size: [0.34, 0.12], color: 0xFFF0BF, alpha: [0.95, 0], light: "full" }]
        },
        warded: {
            exit: { drain: 8 }, emitters: [{ name: "ward_star", bind: "target", height: 1.05,
                particle: "world_combat_core:cobblemon/generic/star", rate: 5,
                speed: 0, lifetime: 6, size: [0.18, 0.12], color: 0xFFD26E, alpha: [0.6, 0], light: "full", maxParticles: 2 }]
        },
        guard: {
            duration: 26,
            exit: { stop: 9, drain: 22 },
            emitters: [
                {
                    name: "guard_flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: { data: "motes", fallback: 24 } }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "inward", speed: [0.06, 0.2], drag: 0.9,
                    lifetime: [10, 18], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFF0BF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "guard_spark", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xFFD26E, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 26
                }
            ]
        }
    }
};
WorldCombatParticles.scene("world_combat:move_luckychant", 1, LuckychantDefinition);
