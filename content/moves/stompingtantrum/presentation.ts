/**
 * 跺脚 / stompingtantrum 的客户端表现。
 *
 * 一句话：施法者沉身一跺、脚下尘土一跳 → 地面朝目标裂开一条土石迸溅的缝 → 缝上的人被掀飞、土石炸开；
 *   带憋愤时缝的尽头再崩开一圈更大的碎岩，最后地面留下一道慢慢平复的裂痕。
 * 色相家族：干燥的土黄与赭石（0xC9A46A / 0x8A6B45）为主体，热琥珀（0xFFB257）只出现在「尽头补崩」的那一圈；
 *   不引入第二个色相。
 * 拍子：起 stomp（跺脚预告）→ 裂 fissure（裂缝沿 path 掠向目标）→ 击 burst（缝上土石炸开）→ 崩 collapse（尽头补崩，仅翻倍）→ 痕 rent（裂痕停留）。
 * 范围：fissure 与 rent 用与判定同一条 `data.path`（脚下→目标）画裂缝；collapse 的环按 `data.shock`（机制崩塌半径）收束。
 * 运动：土石沿 path 从脚下掠向目标，到点向上迸起；裂痕贴地留下。
 * 数：burst／collapse 的碎块量绑定 `data.flows`（物攻与等级换算），强度绑定命中威力。
 */
const StompingtantrumDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        stomp: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "stomp_dust", bind: "source", offset: [0, 0.04, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xBFA37A, alpha: [0.7, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fissure: {
            duration: 26,
            exit: { stop: 14, drain: 14 },
            emitters: [
                {
                    name: "fissure_line", bind: "path", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "flows", fallback: 18 }, at: 0 },
                    rate: 22, direction: "shape", speed: [0.4, 1.1], spread: 12,
                    lifetime: [6, 13], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x8A6B45, alpha: [0.85, 0], light: "world", bloom: 0.12, maxParticles: 90
                },
                {
                    name: "fissure_dust", bind: "path", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "flows", fallback: 12 }, at: 0 },
                    rate: 18, direction: "shape", speed: [0.2, 0.6],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xC9A46A, alpha: [0.55, 0], light: "world", maxParticles: 70
                }
            ]
        },
        burst: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst_rock", bind: "target", offset: [0, 0.25, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "flows", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "up", speed: [0.12, 0.4],
                    gravity: 0.05, drag: 0.96, spread: 40,
                    lifetime: [10, 18], size: [0.16, 0.05],
                    color: 0x9A6B3A, alpha: [0.95, 0], light: "world", maxParticles: 40
                },
                {
                    name: "burst_hit", bind: "target", offset: [0, 0.2, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [7, 12], size: [0.34, 0.06],
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", maxParticles: 6
                },
                {
                    name: "burst_core", bind: "target", offset: [0, 0.2, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [9, 16], size: [0.28, { data: "scale", fallback: 1 }], sizeMode: "linear",
                    color: 0xC9A46A, alpha: [0.5, 0], light: "full", maxParticles: 8
                }
            ]
        },
        collapse: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "collapse_ring", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "shock", fallback: 1.3 } },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 18], size: [0.4, 0.9], sizeMode: "linear",
                    color: 0xFFB257, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 8
                },
                {
                    name: "collapse_rock", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "flows", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "shock", fallback: 1.3 } },
                    direction: "up", speed: [0.16, 0.5], gravity: 0.06, drag: 0.95,
                    lifetime: [10, 18], size: [0.18, 0.05],
                    color: 0xB07C40, alpha: [0.95, 0], light: "world", maxParticles: 44
                }
            ]
        },
        rent: {
            duration: 28,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "rent_seam", bind: "path", fit: "none", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    shape: { kind: "polyline" },
                    burst: { count: 8, at: 0 },
                    rate: 6, direction: "outward", speed: [0.01, 0.04],
                    lifetime: [18, 30], size: [0.12, 0.02],
                    color: 0x8A6B45, alpha: [0.5, 0], light: "world", maxParticles: 40
                },
                {
                    name: "rent_seep", bind: "path", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    rate: 8, direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.07, 0.01],
                    color: 0xBFA37A, alpha: [0.4, 0], light: "world", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stompingtantrum", 1, StompingtantrumDefinition);
