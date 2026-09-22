/**
 * 冰息 / frostbreath 的客户端表现。
 *
 * 一句话：施法者深吸一口气、嘴边凝起霜，随后一整片冷雾从口中铺开、慢慢漫过扇形的每一个角落，
 *   罩住的人身上炸开冰色冲击、脚边结出霜点；没罩到人时冷雾在末端散去。
 * 色相家族：冰蓝（0xCFEAF8 / 0xDCF4FF）为主体，近白（0xF2FBFF）在强调与霜点；饱和只出现在命中核心的小面积。
 * 拍子：起 inhale（吸气凝霜）→ 呼 exhale（冷雾铺开）→ 击 burst/hit（罩住与冰爆）→ 果 rime（结霜）→ 收 miss。
 * 范围：exhale 的 region 用与判定同一组 `data.path` 顶点、按 `polygon` 填满整个扇形——玩家一眼看出站哪会被罩住。
 * 运动：front 绑施法者、orient:direction 沿 `data.direction` 铺出 `data.reach` 长的锥形雾，到 `data.delay` 停下；
 *   region 在冷雾漫到的那一刻（burst.at = delay）把整片区域点亮。
 * 数：`data.motes`（特攻与等级派生）决定雾点密度，`data.cells`（结霜格数）决定霜点数量，`data.size` 随雾团半径。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FrostbreathDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "breath_build", bind: "source", offset: [0, 0.05, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 20, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.14], spin: 40,
                    lifetime: [8, 15], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xDCF4FF, alpha: [0.75, 0], light: "full", maxParticles: 60
                },
                {
                    name: "breath_glow", bind: "source", offset: [0, 0.05, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xF2FBFF, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        exhale: {
            duration: 64,
            exit: { stop: 54, drain: 20 },
            emitters: [
                {
                    name: "front", bind: "source", offset: [0, 0.05, 0], height: 0.72, fit: "none",
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: { data: "motes", fallback: 20 },
                    shape: { kind: "cone_volume", radius: { data: "radius", fallback: 0.9 }, length: { data: "reach", fallback: 8 }, angleDegrees: { data: "halfAngle", fallback: 29 } },
                    direction: "shape", speed: [0.12, 0.34], spread: 8, spin: 30,
                    stop: { data: "delay", fallback: 14 },
                    lifetime: [7, 14], size: { data: "size", fallback: 0.14 }, sizeMode: "sin",
                    color: 0xDCF4FF, alpha: [0.55, 0], light: "full", maxParticles: 160
                },
                {
                    name: "region", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "motes", fallback: 20 }, at: { data: "delay", fallback: 14 } },
                    shape: { kind: "polygon" }, direction: "shape", speed: [0.02, 0.1], spread: 10,
                    lifetime: [16, 28], size: { data: "size", fallback: 0.14 }, sizeMode: "linear",
                    color: 0xCFEAF8, alpha: [0.4, 0], light: "world", maxParticles: 120
                },
                {
                    name: "region_glints", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 18 }, at: { data: "delay", fallback: 14 } },
                    shape: { kind: "polygon" }, direction: "shape", speed: [0.04, 0.16], spread: 24, spin: 20,
                    lifetime: [8, 16], size: { data: "size", fallback: 0.14 }, sizeMode: "sin",
                    color: 0xF2FBFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "gust", bind: "point", fit: "none", offset: [0, 0.35, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.6 }, direction: "outward", speed: [0.08, 0.26],
                    lifetime: [10, 20], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xDCF4FF, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.4 }, direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 18], size: [0.4, 0.9],
                    color: 0xCFEAF8, alpha: [0.55, 0], light: "full"
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.12, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: { data: "size", fallback: 0.18 } },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: 8, size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 12
                },
                {
                    name: "shroud", bind: "target", offset: [0, 0.2, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere", radius: { data: "size", fallback: 0.18 } },
                    direction: "outward", speed: [0.04, 0.16], spin: 20,
                    lifetime: [12, 22], size: [0.14, 0.03],
                    color: 0xCFEAF8, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        rime: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "frost_set", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: { data: "cells", fallback: 8 } },
                    shape: { kind: "box", size: [2.2, 0.2, 2.2] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 26], size: [0.09, 0.02],
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "frost_ring", bind: "point", fit: "none", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.6 }, direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.3, 0.7],
                    color: 0xCFEAF8, alpha: [0.5, 0], light: "full", maxParticles: 5
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "dissipate", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02, drag: 0.92,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xCFEAF8, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_frostbreath", 1, FrostbreathDefinition);
