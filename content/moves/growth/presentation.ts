/** 生长的绿环、草叶与阳光强调层；scale 控制表现半径。 */
const GrowthDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "seeds_in", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 18, shape: { kind: "circle", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [8, 14], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0x8CC63F, alpha: [0.7, 0], light: "world", maxParticles: 44
                },
                {
                    name: "green_glow", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xC7F08A, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        swell: {
            duration: 34,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "body_grow", bind: "source", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: 14, at: 1 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.24, 0.85], sizeMode: "linear",
                    color: 0x8CC63F, alpha: [0.65, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "body_surge", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "blades", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x9CD44A, alpha: [0.85, 0], light: "world", maxParticles: 90
                },
                {
                    name: "ground_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 8 },
                    shape: { kind: "ring", radius: 2.4 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [12, 20], size: [0.44, 0.8], sizeMode: "index",
                    color: 0x6FBF4A, alpha: [0.6, 0], light: "world", maxParticles: 28
                },
                {
                    name: "sun_flare", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "sunGold", fallback: 0 } },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 18], size: [0.11, 0.02],
                    color: 0xFFE07A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 90
                }
            ]
        },
        sprout: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "blades_up", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "blades", fallback: 10 }, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: 2.3 },
                    direction: "up", speed: [0.06, 0.2], gravity: 0.04, drag: 0.95, spin: 40,
                    lifetime: [12, 22], size: [0.13, 0.02], sizeMode: "index",
                    color: 0x8CC63F, alpha: [0.85, 0], light: "world", maxParticles: 120
                },
                {
                    name: "leaves_fall", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "blades", fallback: 10 } },
                    shape: { kind: "sphere", radius: 1.6 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.05, drag: 0.9, spin: 60,
                    lifetime: [14, 24], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x6FA83A, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "edge_glow", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 2.35 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xD6F58A, alpha: [0.55, 0], light: "full", maxParticles: 60
                }
            ]
        },
        settle: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "soil", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 26 },
                    shape: { kind: "circle", radius: 1.5 },
                    direction: "outward", speed: [0.02, 0.06], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x5A7A34, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_growth", 1, GrowthDefinition);
