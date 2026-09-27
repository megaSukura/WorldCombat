/** 细线锁定与收紧倒数保持到守候结束；识别后只闪自身，命中由真正复制动作回执呈现。 */
const mefirstDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        native_contact: { duration: 5, exit: { stop: 2, drain: 3 }, emitters: [{ name: "shadow_palm", bind: "source", height: 0.5, orient: "direction",
            particle: "world_combat_core:cobblemon/generic/hollowfist", burst: { count: 1 }, shape: { kind: "point" },
            direction: [0,0,1], speed: .5, lifetime: 3, size: [.4,.15], color: 0xFFB347, alpha: [.85,0], light: "full" }] },
        native_flight: { exit: { stop: 0, drain: 5 }, emitters: [{ name: "shadow_flight", bind: "projectile",
            particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle", rate: 14, trail: { minDistance: .2 },
            shape: { kind: "point" }, speed: 0, lifetime: 6, size: [.06,.02], color: 0xFFB347, alpha: [.6,0], light: "world" }] },
        native_hit: { duration: 10, exit: { stop: 0, drain: 5 }, emitters: [{ name: "shadow_hit", bind: "point",
            particle: "world_combat_core:cobblemon/generic/hit_yellow", burst: { count: 1 }, shape: { kind: "point" },
            speed: 0, lifetime: 5, size: [.3,.05], color: 0xFFB347, alpha: [.9,0], light: "full" }] },
        native_miss: { duration: 8, exit: { stop: 0, drain: 5 }, emitters: [{ name: "shadow_miss", bind: "point",
            particle: "world_combat_core:cobblemon/generic/tinydust", burst: { count: 3 }, shape: { kind: "sphere", radius: .12 },
            speed: .02, lifetime: 5, size: [.06,.02], color: 0xFFB347, alpha: [.4,0], light: "world" }] },
        read: {
            exit: { stop: 0, drain: 6 },
            emitters: [
                { name: "vigil_arc", bind: "source", height: 0.1, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 9, shape: { kind: "arc", radius: 0.65, arcDegrees: { data: "arc", fallback: 360 } },
                    speed: 0, lifetime: 7, size: [.07,.02], color: 0xFFB347, alpha: [.65,0], light: "world", maxParticles: 8 },
                { name: "vigil_line", bind: "path", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "polyline" }, speed: 0, lifetime: 6,
                    size: [.025,.01], color: 0xFFE3B0, alpha: [.2,0], light: "world", maxParticles: 4 }
            ]
        },
        take: {
            duration: 26,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "take_line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: { data: "sparks", fallback: 6 }, trail: { minDistance: 0.2 },
                    shape: { kind: "polyline" },
                    direction: "shape", speed: [0.3, 0.6],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xFFD9A0, alpha: [0.85, 0], light: "full", bloom: { data: "surge", fallback: 0.4 }, maxParticles: 90
                },
                {
                    name: "take_flash", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "sparks", fallback: 6 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.18, 0.4], spread: 16,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0xFFF1D8, alpha: [0.95, 0], light: "full", bloom: { data: "surge", fallback: 0.5 }, maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "miss_dim", bind: "source", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0x8A8378, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mefirst", 1, mefirstDefinition);
