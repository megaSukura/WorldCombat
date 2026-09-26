const BurnupDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        kindle: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 26, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [8, 15], size: [0.18, 0.03], sizeMode: "sin",
                    color: 0xFFB347, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "white_core", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0xFFF1D6, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 50
                }
            ]
        },
        burst: {
            exit: { stop: 0, drain: 10 },
            emitters: [
                { name: "white_front", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 90, shape: { kind: "polyline" }, direction: "up", speed: [0.01, 0.04],
                    lifetime: [5, 9], size: [0.28, 0.04], color: 0xFFF1D6, alpha: [0.9, 0], light: "full" },
                { name: "spent_edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember", rate: { data: "ember", fallback: 24 },
                    shape: { kind: "polyline" }, direction: "up", speed: 0.02,
                    lifetime: [9, 14], size: [0.09, 0.02], color: 0xFFB347, alpha: [0.6, 0], light: "world" }
            ]
        },
        scorch: {
            duration: 26,
            exit: { stop: 11, drain: 20 },
            emitters: [
                {
                    name: "sear", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 26, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.14, 0.46],
                    lifetime: [7, 14], size: [0.28, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 100
                },
                {
                    name: "sear_flame", bind: "target", offset: [0, 0.3, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 40, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.05, 0.24],
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xFFB347, alpha: [0.9, 0], gravity: 0.03, drag: 0.9, light: "full", maxParticles: 140
                }
            ]
        },
        splash: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "wash", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.24, 0.04], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "wash_ember", bind: "target", offset: [0, 0.25, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 20, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.03, drag: 0.91,
                    lifetime: [9, 18], size: [0.08, 0.02],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", maxParticles: 70
                }
            ]
        },
        spent: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "dying_embers", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.07],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xD9611E, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "cold_ash", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.94,
                    lifetime: [16, 28], size: [0.3, 0.12],
                    color: 0x2A2118, alpha: [0.35, 0], light: "world", maxParticles: 50
                }
            ]
        },
        reignite: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "spark_back", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xFFB347, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_burnup", 1, BurnupDefinition);
