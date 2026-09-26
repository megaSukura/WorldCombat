/** 四个短寿命附着虫簇由剩余虫份分别开关，甩落沿实际运动反向落下。 */
const InfestationDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    rate: 20, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xA8B83A, alpha: [0.85, 0], light: "world", maxParticles: 100
                }
            ]
        },
        cast: {
            duration: 70,
            exit: { stop: 50, drain: 16 },
            emitters: [
                {
                    name: "swarm_flight", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    rate: 50, shape: { kind: "sphere", radius: 0.2 },
                    direction: "shape", speed: [0.02, 0.12], trail: { minDistance: 0.18 },
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x8FA83A, alpha: [0.9, 0], light: "world", maxParticles: 200
                },
                {
                    name: "swarm_dust", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 24, shape: { kind: "sphere", radius: 0.18 },
                    direction: "shape", speed: [0.01, 0.06], trail: { minDistance: 0.24 },
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x8A7A4A, alpha: [0.5, 0], light: "world", maxParticles: 120
                }
            ]
        },
        cling: {
            duration: 28,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "attach_ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 16], size: [0.3, 0.08],
                    color: 0x9AA84A, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "wrap", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [10, 16], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xC8D060, alpha: [0.7, 0], light: "world", maxParticles: 70
                }
            ]
        },
        bite: {
            duration: 20,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "nibble", bind: "target", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE8F0A0, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "bug_burst", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    burst: { count: { data: "count", fallback: 24 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [9, 16], size: [0.1, 0.03],
                    color: 0x8FA83A, alpha: [0.8, 0], gravity: 0.05, drag: 0.92, light: "world", maxParticles: 120
                }
            ]
        },
        swarm: { emitters: [
                { name: "group0", bind: "target", offset: [-0.3, 0.2, 0], fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ground_bugs", rate: { data: "g0", fallback: 10 },
                    shape: { kind: "point" }, speed: 0, lifetime: 4, size: .1, color: 0x8FA83A, alpha: [.8, .2], light: "world" },
                { name: "group1", bind: "target", offset: [0.3, 0.2, 0], fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ground_bugs", rate: { data: "g1", fallback: 10 },
                    shape: { kind: "point" }, speed: 0, lifetime: 4, size: .1, color: 0x8FA83A, alpha: [.8, .2], light: "world" },
                { name: "group2", bind: "target", offset: [-0.2, 0.8, 0], fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ground_bugs", rate: { data: "g2", fallback: 10 },
                    shape: { kind: "point" }, speed: 0, lifetime: 4, size: .1, color: 0x8FA83A, alpha: [.8, .2], light: "world" },
                { name: "group3", bind: "target", offset: [0.2, 0.8, 0], fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ground_bugs", rate: { data: "g3", fallback: 10 },
                    shape: { kind: "point" }, speed: 0, lifetime: 4, size: .1, color: 0x8FA83A, alpha: [.8, .2], light: "world" }
        ] },
        shed: { duration: 16, emitters: [
            { name: "shed", bind: "point", orient: "direction", particle: "world_combat_core:cobblemon/generic/ground_bugs",
                burst: { count: { data: "count", fallback: 1 } }, shape: { kind: "point" }, direction: [0, -.2, -1],
                speed: .12, gravity: .04, lifetime: 12, size: [.1, .04], color: 0x8FA83A, alpha: [.8, 0], light: "world" }
        ] },
        release: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "scatter", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    burst: { count: 30 },
                    shape: { kind: "sphere", radius: 0.46 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x8FA83A, alpha: [0.7, 0], gravity: 0.04, light: "world", maxParticles: 100
                }
            ]
        },
        fizzle: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "ground_hit", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0x8A7A4A, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        immune: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "repel", bind: "target", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0x6E6A64, alpha: [0.3, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_infestation", 1, InfestationDefinition);
