/**
 * Client definition for Conversion.
 *
 * 一句话：一圈中性扫描环从身体收拢，随后以新属性色（data.type 走共享 type 色表）向外炸开一圈光晕，光带条数随
 * 施法者的特攻（data.shades）增减，半径随机制（data.radius）。
 *
 * 色相家族：扫描层是近白中性色，属性色只出现在落成层的 halo 与 core 上，是画面里唯一的饱和色。
 * 拍子：scan 0–14t（收拢，由亮到暗）→ settle 0–40t（击 0–14t，收 14–40t）。
 * 贴图与帧尺寸来自 particle_types.txt。
 */
const conversionDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        scan: {
            duration: 16,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "scan_ring", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "shades", fallback: 8 } },
                    shape: { kind: "ring", radius: 1.05 },
                    direction: "inward", speed: [0.07, 0.11], spread: 3,
                    lifetime: [10, 15], size: [0.24, 0.10],
                    color: 0xE8E8F0, alpha: [0.5, 0], light: "full", maxParticles: 80
                },
                {
                    name: "scan_motes", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 26,
                    shape: { kind: "sphere_surface", radius: 0.95 },
                    direction: "inward", speed: [0.08, 0.16], spread: 6,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "scan_floor", bind: "source", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 14, interval: 3, repeats: 3 },
                    shape: { kind: "ring", radius: 0.85 },
                    direction: "inward", speed: [0.05, 0.09],
                    lifetime: [10, 16], size: [0.22, 0.06],
                    color: 0xCFD3DE, alpha: [0.4, 0], light: "full", maxParticles: 60
                }
            ]
        },
        settle: {
            duration: 44,
            exit: { stop: 26, drain: 34 },
            emitters: [
                {
                    name: "type_halo", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: { data: "shades", fallback: 8 } },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.0 } },
                    direction: "outward", speed: [0.5, 0.72], spread: 2,
                    lifetime: [18, 26], size: [0.4, 0.95],
                    color: TypeColors.binding("type", 0xE8E8F0),
                    alpha: [0.6, 0], light: "full", maxParticles: 140
                },
                {
                    name: "type_ribbons", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "shades", fallback: 8 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.85 },
                    direction: "outward", speed: [0.16, 0.34], spread: 10,
                    lifetime: [14, 24], size: [0.14, 0.03],
                    alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 220
                },
                {
                    name: "type_core", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 8, at: 2 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.04, 0.16],
                    lifetime: [8, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: TypeColors.binding("type", 0xE8E8F0), alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "settle_smoke", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    start: 4, rate: 12,
                    shape: { kind: "ring", radius: 0.75 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [22, 34], size: [0.3, 0.08],
                    color: 0x33343A, alpha: [0.28, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_conversion", 1, conversionDefinition);
