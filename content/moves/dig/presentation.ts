/**
 * 挖洞 / Dig 的粒子语言。
 *
 * 一句话：脚边裂开细缝、尘土上漏 → 施法者塌进地面 → 落点先画出范围，随后整块地面炸起，与真实半径
 * 等宽的冲击环、被掀起的土石和尘柱一起向外抛 → 尘落。
 *
 * 色相家族：暖土（0x8A6A48）为主体，浅尘（0xC8B088）只给冲击闪与击芯，暗土（0x4A3826）作碎屑。
 * 石地改用灰岩色、水面改用偏冷的湿色——同一套靠质量与运动读的层，不靠高饱和色。
 * 拍子：起（mark 范围 + windup 脚边裂缝）／沉（dive）／破（erupt 约 50t）／收（各层 alpha 归零）。
 *
 * 机制驱动：`data.scale`（实际破土半径 / 定义参考半径 2.6）缩放整个范围与粒子尺寸，
 * `data.intensity`（1 + 命中数）乘上每个发射器的 rate 与 burst.count——一次罩住几个人，画面就厚几分。
 *
 * 层与职责（每个 erupt 变体相同）：
 *   发射器 | 职责 | 贴图                             | 运动
 *   rim    | 范围 | generic/ring/groundquake         | 贴地外扩到恰好 radius（随 data.scale）
 *   fill   | 主体 | generic/tinydust                 | 圆盘内向上翻起
 *   core   | 强调 | generic/impact/impact_ground     | 球面外爆、帧条
 *   rocks  | 细节 | generic/large_rock 或 earth      | 上抛 + 落地弹跳
 *   debris | 细节 | generic/earth 或 mudsplash       | 向外散 + 重力 + 自转
 *   column | 余韵 | generic/smoke/smoke              | 向上抽的尘柱
 *   settle | 余韵 | generic/tinydust                 | 贴地慢慢散开的尘
 *   settle | 细节 | generic/earth                    | 小土块抛落
 * 持续状态：无；没有“钻地无敌”，全部是一次性爆发；落点那一层被换成粗土／碎石（world.terrain 租借），到期自行恢复。
 */
function digEruption(rock: string, debris: string, rimColor: number, coreColor: number, rockColor: number, debrisColor: number, smokeColor: number, strength: number): ParticleMoment {
    return {
        duration: 54,
        exit: { stop: 18, drain: 40 },
        emitters: [
            {
                name: "rim", bind: "point", offset: [0, 0.05, 0], height: 0,
                particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                burst: { count: Math.round(54 * strength) },
                shape: { kind: "ring", radius: 2.6 },
                direction: "outward", speed: [0.34, 0.46], spread: 3,
                lifetime: [16, 22], size: [0.5, 0.9],
                color: rimColor, alpha: [0.8, 0], light: "world", maxParticles: 90
            },
            {
                name: "fill", bind: "point", offset: [0, 0.04, 0], height: 0,
                particle: "world_combat_core:cobblemon/generic/tinydust",
                burst: { count: Math.round(70 * strength), interval: 2, repeats: 2 },
                shape: { kind: "circle", radius: 2.4, thickness: 0.25 },
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
        mark: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "rim", bind: "point", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 3, interval: 5, repeats: 2 },
                    shape: { kind: "ring", radius: 2.6 },
                    direction: "outward", speed: [0.01, 0.03],
                    lifetime: [16, 24], size: [0.34, 0.03],
                    color: 0xC8B088, alpha: [0.5, 0], light: "world", maxParticles: 20
                },
                {
                    name: "seep", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: 2.2, thickness: 0.2 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.07, 0.01],
                    color: 0x8A6A48, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        },
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
        // 计划落点没能到达：预告在计划点上向内收熄，读得出这一铲没在原定处破土。
        mark_lost: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "lost_seep", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 2.6 },
                    direction: "inward", speed: [0.05, 0.16], gravity: 0.02,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x8A6A48, alpha: [0.45, 0], light: "world", maxParticles: 44
                },
                {
                    name: "lost_fizzle", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 22], size: [0.18, 0.3],
                    color: 0x6A4E32, alpha: [0.3, 0], light: "world", maxParticles: 16
                }
            ]
        },
        dive: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "collapse", bind: "source", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 24 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.12, 0.28],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x6A4E32, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "puff", bind: "source", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [18, 30], size: [0.24, 0.36],
                    color: 0x8A6A48, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        erupt: digEruption("world_combat_core:cobblemon/generic/earth", "world_combat_core:cobblemon/generic/mud/mudsplash", 0x8A6A48, 0xC8B088, 0x6A4E32, 0x4A3826, 0x8A6A48, 1.0),
        erupt_stone: digEruption("world_combat_core:cobblemon/generic/large_rock", "world_combat_core:cobblemon/generic/earth", 0x8A8A82, 0xD0D0C8, 0x5A5A54, 0x4A4A48, 0x7A7A74, 0.85),
        erupt_wet: digEruption("world_combat_core:cobblemon/generic/water/giantsplash", "world_combat_core:cobblemon/generic/earth", 0x5A7A6A, 0xA8C0B8, 0x4A3826, 0x3A5A4A, 0x9AA8A0, 0.55),
        settle: {
            duration: 36,
            exit: { stop: 14, drain: 28 },
            emitters: [
                {
                    name: "dust", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 44, interval: 2, repeats: 2 }, shape: { kind: "circle", radius: 2.2 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.02, drag: 0.96,
                    lifetime: [18, 32], size: [0.07, 0.01],
                    color: 0x8A6A48, alpha: [0.4, 0], light: "world", maxParticles: 110
                },
                {
                    name: "pebbles", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 10 }, shape: { kind: "circle", radius: 1.6 },
                    direction: "up", speed: [0.06, 0.16], gravity: 0.06, spin: 60,
                    lifetime: [16, 30], size: [0.1, 0.02],
                    color: 0x6A4E32, alpha: [0.85, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dig", 1, DigDefinition);
