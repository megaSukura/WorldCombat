/**
 * 封印 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者头上聚起一枚封印，砸进地面铺成冷紫的领域环，环内与施法者共有招式的对手被一道道符文
 * 扣住；领域撑着时环一直在，收起时符环向外散去。
 *
 * 色相家族：冷靛紫（0x6C7BFF）画领域与主体，近白符文（0xDCE6FF / 0xCFE8FF）做铭文与高光，
 *   深靛（0x2B2350）做烟尘。被顶回去的一手改播亮紫冲击（0x9AA6FF），与「说出口」区分开。
 * 层次：起（windup 聚印）／落（seal 柱 + 领域环 + 纹路）／持续（hold 低密度环与符文）／
 *   落印（brand 符文链扣在对手身上）／顶回（reject）／散（fade 自行散去、snap 被人硬拆）。
 * 起击收：windup → seal → hold → brand → reject／fade／snap。
 * 数：封印纹数来自 data.seals，领域半径来自 data.radius（判定与画面同一组尺寸），
 *   被锁的招式数来自 data.shared，落印符文数来自 data.count——都由服务端算出的机制值驱动。
 */
const ImprisonDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "windup_swirl", bind: "source", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 10, interval: 4, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.22, 0.08], sizeMode: "sin",
                    color: 0x6C7BFF, alpha: [0.8, 0], light: "full", maxParticles: 32
                },
                {
                    name: "windup_dust", bind: "source", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "circle", radius: 0.6 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.1, 0.03],
                    color: 0x2B2350, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        },
        seal: {
            duration: 44,
            exit: { stop: 18, drain: 30 },
            emitters: [
                {
                    name: "seal_column", bind: "target", height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 40, shape: { kind: "line", length: 3 },
                    direction: "shape", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0x6C7BFF, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "seal_domain", bind: "point", fit: "none", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "seals", fallback: 10 }, interval: 2, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 6 } },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [14, 22], size: [0.28, 0.1],
                    color: 0xCFE8FF, alpha: [0.6, 0], light: "full", maxParticles: 120
                },
                {
                    name: "seal_ground", bind: "point", fit: "none", height: 0.01,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: { data: "seals", fallback: 10 } },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 6 } },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [16, 26], size: 0.3,
                    color: 0x6C7BFF, alpha: [0.5, 0], light: "full", maxParticles: 80
                },
                {
                    name: "seal_marks", bind: "point", fit: "none", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "seals", fallback: 10 } }, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0xDCE6FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 80
                }
            ]
        },
        hold: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "hold_ring", bind: "point", fit: "none", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 4, shape: { kind: "ring", radius: { data: "radius", fallback: 6 } },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [22, 34], size: [0.16, 0.05],
                    color: 0x6C7BFF, alpha: [0.3, 0], light: "full", maxParticles: 40
                },
                {
                    name: "hold_runes", bind: "point", fit: "none", height: 1.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    rate: { data: "shared", fallback: 4 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "down", speed: [0.01, 0.05],
                    lifetime: [18, 28], size: [0.1, 0.02],
                    color: 0xCFE8FF, alpha: [0.5, 0], light: "full", maxParticles: 30
                }
            ]
        },
        brand: {
            duration: 28,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "brand_chain", bind: "target", height: 1.6,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    burst: { count: { data: "count", fallback: 3 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.08, 0.2],
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xCFE8FF, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "brand_ring", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "count", fallback: 3 } }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.06, 0.14],
                    lifetime: [10, 16], size: [0.24, 0.05],
                    color: 0x6C7BFF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        reject: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "reject_burst", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [6, 11], size: [0.24, 0.03], sizeMode: "index",
                    color: 0x9AA6FF, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 30,
            exit: { stop: 8, drain: 26 },
            emitters: [
                {
                    name: "fade_ring", bind: "point", fit: "none", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "radius", fallback: 6 } },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 6 } },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [18, 28], size: [0.24, 0.08],
                    color: 0x6C7BFF, alpha: [0.4, 0], light: "full", maxParticles: 60
                },
                {
                    name: "fade_smoke", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [20, 34], size: [0.22, 0.4],
                    color: 0x2B2350, alpha: [0.22, 0], light: "world", maxParticles: 30
                }
            ]
        },
        snap: {
            duration: 24,
            exit: { stop: 7, drain: 17 },
            emitters: [
                {
                    name: "snap_burst", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [6, 12], size: [0.26, 0.03], sizeMode: "index",
                    color: 0x8E9BFF, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "snap_runes", bind: "point", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xCFE8FF, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_imprison", 1, ImprisonDefinition);
