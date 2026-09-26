/**
 * 极光束 / aurorabeam 的客户端表现。
 *
 * 一句话：施法者身前把冷光折成一点棱镜 → 一条彩虹缎带沿瞄准线冲出去、一路留下跳跃的虹色光点 →
 * 命中处炸开冰色冲击与一圈虹光，落点地面结出一小片霜；被冷光刺到的人身上再亮一圈虹环。
 * 撞到冰雪表面时先在真实方块面上亮出一个小接触斑，随即在角点折一下、留下一闪棱镜光。
 * 色相家族：冰蓝（0x9FE8FF / 0xB8F0FF）为主体，虹彩（shinesparkle_rainbow 原色）只在光带与强调层跳动。
 * 拍子：起 windup（折棱镜）→ 行 travel（光带冲刺）→ 击 beam/hit（光带与命中）→ 折 glint/prism（冰面折射）
 *   → 果 chill（降攻）与 rime（结霜）→ 收 miss。
 * 范围：beam 的光带用真实飞行段拼出的 `data.path` 画出「照到了哪」；rime 的霜斑按 `data.scale`（band / 10）铺开。
 * 运动：travel 绑 projectile 沿每段真实方向拖尾；beam 沿真实折线拉一条残余光带；rime 的霜点贴地向外扩。
 * 数：`data.shimmer`（特攻与等级派生）决定光带与命中虹光的密度，`data.intensity` 抬高亮度。
 */
const AuroraBeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "prism_rainbow", bind: "source", offset: [0, 0.05, 0], height: 0.68,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: 14, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.1], spin: 10,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "prism_core", bind: "source", offset: [0, 0.05, 0], height: 0.68,
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    rate: 12, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0x9FE8FF, alpha: [0.85, 0], light: "full", maxParticles: 30
                }
            ]
        },
        travel: {
            duration: 90,
            exit: { stop: 70, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smallbeam",
                    rate: 40, shape: { kind: "sphere", radius: 0.12 },
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.26, 0.06],
                    color: 0xB8F0FF, alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "rainbow", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    trail: { minDistance: 0.24 }, rate: { data: "shimmer", fallback: 16 }, spin: 12,
                    direction: "away", speed: [0.0, 0.05], spread: 26,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 110
                },
                {
                    name: "frost_tail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    trail: { minDistance: 0.5 }, rate: 6,
                    direction: "away", speed: [0.0, 0.04], spread: 30,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xCFF4FF, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        beam: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "shimmer", fallback: 16 } },
                    shape: { kind: "polyline" }, direction: "shape", speed: [0.02, 0.12], spread: 16, spin: 10,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        glint: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "patch", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shimmer", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.08], spread: 40,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xCFF4FF, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        prism: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fold", bind: "point", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "shimmer", fallback: 14 } },
                    shape: { kind: "line", length: 0.7 },
                    direction: "shape", speed: [0.04, 0.16], spread: 22, spin: 14,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "corner", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0x9FE8FF, alpha: [0.9, 0], light: "full", maxParticles: 12
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.12, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE8FBFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 10
                },
                {
                    name: "rainbow_burst", bind: "target", offset: [0, 0.3, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "shimmer", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.22], spread: 34, spin: 14,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", maxParticles: 80
                }
            ]
        },
        chill: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "chill_ring", bind: "target", offset: [0, 0.18, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: 2, interval: 3 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spin: 10,
                    lifetime: [10, 16], size: [0.18, 0.4],
                    color: 0xB8F0FF, alpha: [0.75, 0], light: "full", maxParticles: 10
                },
                {
                    name: "chill_mist", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.16, 0.03],
                    color: 0x9FE8FF, alpha: [0.35, 0], light: "world", maxParticles: 18
                }
            ]
        },
        rime: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "frost", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: { data: "cells", fallback: 10 } },
                    shape: { kind: "box", size: [1.6, 0.2, 1.6] },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0xE8FBFF, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "sheen", bind: "point", fit: "none", offset: [0, 0.03, 0], orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [14, 22], size: [0.3, 0.8],
                    color: 0x9FE8FF, alpha: [0.45, 0], light: "full", maxParticles: 5
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.1, 0.01],
                    color: 0xFFFFFF, alpha: [0.5, 0], light: "full", maxParticles: 18
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aurorabeam", 1, AuroraBeamDefinition);
