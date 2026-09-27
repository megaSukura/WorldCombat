/**
 * 挖洞 / Dig 的粒子语言。
 *
 * 一句话：脚边裂开细缝、尘土上漏 → 施法者塌进地面 → 沿真实通道在地下攒动几缕土尘 → 从落点破土，掀起的
 * 土石与尘柱一起向外抛 → 尘落。不加范围环，也不留地表冲击痕：画面只跟随身体与它真正开出来的格。
 *
 * 色相家族：暖土（0x8A6A48）为主体，浅尘（0xC8B088）只给冲击闪与击芯，暗土（0x4A3826）作碎屑。
 * 石地改用灰岩色、悬空/水面改用偏冷的湿色——同一套靠质量与运动读的层。
 * 拍子：起（mark 落点 + windup 脚边裂缝）／沉（entry）／行（burrow）／破（erupt）／收（各层 alpha 归零）。
 *
 * 机制驱动：`data.cells`（terrainResult 真正开通的格数）决定入口与地下尘量，`data.scale`（碰撞半径 / 参考 0.45）
 * 缩放破土粒子尺寸，`data.intensity`（1 + 命中）乘上每个发射器的 rate 与 burst.count。
 *
 * 层与职责（erupt 变体相同）：
 *   发射器 | 职责 | 贴图                             | 运动
 *   fill   | 主体 | generic/tinydust                 | 圆盘内向上翻起
 *   core   | 强调 | generic/impact/impact_ground     | 球面外爆、帧条
 *   rocks  | 细节 | generic/large_rock 或 earth      | 上抛 + 落地弹跳
 *   debris | 细节 | generic/earth 或 mudsplash       | 向外散 + 重力 + 自转
 *   column | 余韵 | generic/smoke/smoke              | 向上抽的尘柱
 * 持续状态：无；通道由 world.terrain 租借，动作结束或中断时原方块自己回来，被实体占住的格子推迟到它离开。
 */
function digEruption(rock: string, debris: string, rimColor: number, coreColor: number, rockColor: number, debrisColor: number, smokeColor: number, strength: number): ParticleMoment {
    return {
        duration: 54,
        exit: { stop: 18, drain: 40 },
        emitters: [
            {
                name: "fill", bind: "point", offset: [0, 0.04, 0], height: 0,
                particle: "world_combat_core:cobblemon/generic/tinydust",
                burst: { count: { data: "cells", fallback: 24 }, interval: 2, repeats: 2 },
                shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.25 },
                direction: "up", speed: [0.06, 0.2], gravity: 0.05,
                lifetime: [14, 26], size: [0.08, 0.01],
                color: coreColor, alpha: [0.5, 0], light: "world", maxParticles: 200
            },
            {
                name: "core", bind: "point", offset: [0, 0.25, 0], height: 0,
                particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                burst: { count: Math.round(16 * strength) },
                shape: { kind: "sphere", radius: 0.5, thickness: 0.5 },
                direction: "shape", speed: [0.1, 0.3], spread: 20,
                lifetime: [8, 15], size: [0.48, 0.06], sizeMode: "index",
                color: coreColor, alpha: [1, 0], light: "full", bloom: 0.15
            },
            {
                name: "rocks", bind: "point", offset: [0, 0.3, 0], height: 0,
                particle: rock,
                burst: { count: Math.round(12 * strength), interval: 2, repeats: 2 },
                shape: { kind: "circle", radius: 1.7 },
                direction: "up", speed: [0.16, 0.38], spread: 30,
                gravity: 0.05, drag: 0.99, spin: 40,
                lifetime: [24, 44], size: [0.24, 0.12],
                color: rockColor, alpha: [1, 0], light: "world", maxParticles: 40,
                collision: { bounces: 2, horizontalSpread: 0.5, verticalBounce: 0.4, dragAfter: 0.9, gravityAfter: 0.05 }
            },
            {
                name: "debris", bind: "point", offset: [0, 0.15, 0], height: 0,
                particle: debris,
                burst: { count: Math.round(60 * strength), interval: 2, repeats: 3 },
                shape: { kind: "circle", radius: 2.3 },
                direction: "outward", speed: [0.1, 0.32], spread: 40,
                gravity: 0.04, drag: 0.98, spin: 80,
                lifetime: [18, 34], size: [0.14, 0.03],
                color: debrisColor, alpha: [0.9, 0], light: "world", maxParticles: 220
            },
            {
                name: "column", bind: "point", offset: [0, 0.4, 0], height: 0,
                particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                burst: { count: Math.round(20 * strength), interval: 3, repeats: 4 },
                shape: { kind: "circle", radius: 1.4 },
                direction: "up", speed: [0.05, 0.14],
                lifetime: [26, 48], size: [0.4, 0.1],
                color: smokeColor, alpha: [0.4, 0], light: "world", maxParticles: 100
            }
        ]
    };
}

const DigDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 落点预告：起手就把这一铲的落点画在地上，准备期是对手走开的窗口。
        mark: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "rim", bind: "point", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 3, interval: 5, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.01, 0.03],
                    lifetime: [16, 24], size: [0.34, 0.03],
                    color: 0xC8B088, alpha: [0.5, 0], light: "world", maxParticles: 20
                },
                {
                    name: "seep", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.2 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.07, 0.01],
                    color: 0x8A6A48, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        },
        // 脚边裂开、尘土上漏：准备期的唯一预警之一。
        windup: {
            duration: 20,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "cracks", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 30, shape: { kind: "circle", radius: 0.9 },
                    direction: "up", speed: [0.02, 0.08], spin: 30,
                    lifetime: [14, 26], size: [0.2, 0.04],
                    color: 0x6A4E32, alpha: [0.8, 0], light: "world", maxParticles: 90
                },
                {
                    name: "leak", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "ring", radius: 0.7 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0xC8B088, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        // 入口塌土：通道真正开通的那一格，量随真正开通的格数。
        entry: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "collapse", bind: "point", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "cells", fallback: 20 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.12, 0.28],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x6A4E32, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "puff", bind: "point", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [18, 30], size: [0.24, 0.36],
                    color: 0x8A6A48, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        // 地下攒动：贴着身体的一小圈土尘，只在土里时才可能出现。
        burrow: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "grit", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "circle", radius: 0.5, thickness: 0.2 },
                    direction: "up", speed: [0.02, 0.09], gravity: 0.01,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0x8A6A48, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        },
        // 没有整条可钻通道：只在脚边冒一小撮土，读得出这一铲没发动。
        blocked: {
            duration: 16,
            exit: { stop: 7, drain: 10 },
            emitters: [
                {
                    name: "fizzle", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0x8A6A48, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        erupt: digEruption("world_combat_core:cobblemon/generic/earth", "world_combat_core:cobblemon/generic/mud/mudsplash", 0x8A6A48, 0xC8B088, 0x6A4E32, 0x4A3826, 0x8A6A48, 1.0),
        erupt_stone: digEruption("world_combat_core:cobblemon/generic/large_rock", "world_combat_core:cobblemon/generic/earth", 0x8A8A82, 0xD0D0C8, 0x5A5A54, 0x4A4A48, 0x7A7A74, 0.85)
    }
};

WorldCombatParticles.scene("world_combat:move_dig", 1, DigDefinition);
