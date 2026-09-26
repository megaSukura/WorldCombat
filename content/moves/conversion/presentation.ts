/**
 * Client definition for Conversion.
 *
 * 一句话：首槽属性的符号从四周汇到身体，收拢成一次单环闪；随后一圈当前属性的轮廓贴在身上，直到类型层
 * 到期才随之撤回。光带条数随施法者的特攻（data.shades）增减，落成半径随机制（data.radius）。
 *
 * 色相家族：扫描层用 data.color（首槽属性色）收拢；落成环与持续轮廓只用当前有效属性的 data.color，
 * 是画面里唯一的饱和色。
 * 拍子：scan 0–16t（收拢）→ settle 0–30t（单环炸开）→ aura 长驻（duration 0，随类型层释放）。
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
                    name: "scan_symbol", bind: "source", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "shades", fallback: 6 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.95 },
                    direction: "inward", speed: [0.06, 0.12], spread: 4,
                    lifetime: [8, 13], size: [0.16, 0.03], sizeMode: "sin",
                    color: { data: "color", fallback: 0xE8E8F0 }, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "scan_ring", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "shades", fallback: 8 } },
                    shape: { kind: "ring", radius: 1.05 },
                    direction: "inward", speed: [0.07, 0.11], spread: 3,
                    lifetime: [10, 15], size: [0.24, 0.1],
                    color: { data: "color", fallback: 0xE8E8F0 }, alpha: [0.5, 0], light: "full", maxParticles: 80
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
            duration: 30,
            exit: { stop: 20, drain: 28 },
            emitters: [
                {
                    name: "type_ring", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "shades", fallback: 8 } },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.0 } },
                    direction: "outward", speed: [0.4, 0.62], spread: 2,
                    lifetime: [16, 24], size: [0.34, 0.08],
                    color: { data: "color", fallback: 0xE8E8F0 }, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        aura: {
            duration: 0,
            exit: { stop: 0, drain: 20 },
            emitters: [
                {
                    name: "aura_outline", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 5, start: 4,
                    shape: { kind: "ring", radius: 0.78 },
                    direction: "inward", speed: [0.02, 0.05], spread: 3,
                    lifetime: [16, 24], size: [0.16, 0.03],
                    color: { data: "color", fallback: 0xE8E8F0 }, alpha: [0.35, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_conversion", 1, conversionDefinition);