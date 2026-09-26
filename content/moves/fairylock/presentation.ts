/** A finite lattice marks the same fixed radius used by membership and edge restraint. */
const FairylockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "charge_orbs", bind: "source", height: 1.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 18, shape: { kind: "sphere_surface", radius: 0.9 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [9, 16], size: [0.14, 0.02],
                    color: 0xF7A8D8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 44
                },
                {
                    name: "charge_ring", bind: "source", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 6, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.08], spin: 3,
                    lifetime: [10, 16], size: [0.3, 0.1], sizeMode: "linear",
                    color: 0xFFE6F4, alpha: [0.6, 0], light: "full", maxParticles: 10
                }
            ]
        },
        seal: {
            duration: 34,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "seal_ground", bind: "point", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 30, at: 1 },
                    shape: { kind: "circle", radius: 5, thickness: 0.94 },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [12, 22], size: [0.4, 0.08], sizeMode: "index",
                    color: 0xE07AB8, alpha: [0.85, 0], light: "full", maxParticles: 44
                },
                {
                    name: "seal_bars", bind: "point", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "bars", fallback: 8 }, at: 1 },
                    shape: { kind: "circle", radius: 5, thickness: 1 },
                    direction: "up", speed: [0.08, 0.2], trail: { minDistance: 0.22 },
                    lifetime: [18, 28], size: [0.16, 0.03], sizeMode: "linear",
                    color: 0xFFE6F4, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "seal_wall", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "lattice", fallback: 18 },
                    shape: { kind: "cylinder", radius: 5, length: 3.0 },
                    direction: "shape", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xF7A8D8, alpha: [0.6, 0], light: "full", maxParticles: 160
                }
            ]
        },
        net: {
            duration: 0,
            exit: { stop: 0, drain: 24 },
            emitters: [
                {
                    name: "net_wall", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "lattice", fallback: 18 },
                    shape: { kind: "cylinder", radius: 5, length: 3.0 },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.09, 0.02],
                    color: 0xF7A8D8, alpha: [0.35, 0.05], alphaMode: "sin", light: "full", maxParticles: 140
                },
                {
                    name: "net_ring", bind: "point", offset: [0, 0.07, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 4, shape: { kind: "circle", radius: 5, thickness: 0.96 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [22, 34], size: [0.32, 0.12], sizeMode: "sin",
                    color: 0xE07AB8, alpha: [0.3, 0.06], alphaMode: "sin", light: "world", maxParticles: 24
                }
            ]
        },
        caught: {
            duration: 22,
            exit: { stop: 8, drain: 15 },
            emitters: [
                {
                    name: "caught_ring", bind: "target", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [12, 18], size: [0.34, 0.8], sizeMode: "linear",
                    color: 0xFFE6F4, alpha: [0.85, 0], light: "full", maxParticles: 6
                },
                {
                    name: "caught_sparks", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "lattice", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.09, 0.01],
                    color: 0xF7A8D8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        release: {
            duration: 26,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "release_ring", bind: "point", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 26, at: 1 },
                    shape: { kind: "circle", radius: 5, thickness: 0.96 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [14, 22], size: [0.4, 0.05], sizeMode: "linear",
                    color: 0xE07AB8, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "release_up", bind: "point", offset: [0, 0.2, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "bars", fallback: 8 }, at: 1 },
                    shape: { kind: "circle", radius: 5, thickness: 1 },
                    direction: "up", speed: [0.06, 0.2], gravity: -0.004, drag: 0.94,
                    lifetime: [16, 26], size: [0.08, 0.01],
                    color: 0xF7A8D8, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fairylock", 1, FairylockDefinition);
