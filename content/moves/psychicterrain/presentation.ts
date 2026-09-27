/**
 * 精神场地 / psychicterrain 的客户端表现。
 *
 * 一句话：施法者身周浮起念环、把念力压进地里 → 落点炸开一圈粉色纹路、念纹贴着地皮铺满一块地 →
 * 站上去的活体脚下贴着一层念纹，真正抵消掉一次位移时向地面压亮一圈。
 * 色相家族：粉紫 0xD86FC0 作主体、浅粉 0xE8B6E0 作细节、蓝紫 0x8A6FD0 只给稳定强调。
 * 起击收：起 windup 20t ／击 surge 46t ／持 field 每 5 刻续期 ／击 jolt 20t ／击 brace 22t。
 * 持续状态：field 是贴地旋转的念纹、贴脚的一层薄膜与画在真实半径上的边圈，低密度、不遮视线；边圈画出「站哪会被稳住」。
 *   增幅与位移削减只在贴着地面站在域内期间成立，离地或离场立即解除。
 * 机制驱动：精神域半径决定边圈、薄膜与念纹的实际大小（data.scale = 半径/3.2），念纹数量直接读纹路密度，
 * 增幅越高的场边圈越亮（data.boost）。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 聚念 psyring2   球面内聚    0.2-0.45 12-20 0.7→0 ≤60
 * surge  边环 giantring_white 贴地外扩 0.5-0.9 14-24 0.6→0 ≤40
 * surge  念纹 psyswirl  圆面上浮+spin 0.10-0.03 16-28 0.6→0 ≤200
 * surge  念点 smallsparkle 圆面上浮 0.05-0.02 12-22 0.6→0 ≤160
 * field  边圈 psyring1  环上脉冲    0.4-0.8  20-34 0.32→0 ≤40   （半径 3.2 = 真实精神域半径，即资格边界）
 * field  薄膜 psyspiral 圆面缓浮+spin 0.10-0.05 16-26 0.16→0 ≤120 （贴脚的一层念纹，提示资格来自地面）
 * field  念纹 psyspiral 圆面上浮+spin 0.09-0.03 18-30 0.4→0 ≤180
 * jolt   入场合能 psyring2 球面外散 0.2-0.05 10-20 1→0 ≤30
 * brace  压地 psyring1  贴脚环外散 0.3-0.7 8-16 0.85→0 ≤30 （真正抵消一次位移时，念纹往地面铺开）
 * brace  地尘 smallsparkle 贴地向外 0.05-0.02 8-16 0.8→0 ≤30
 */
const PsychicterrainDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 20, interval: 3, repeats: 3 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.2, 0.06],
                    color: 0xD86FC0, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 60 }
            ]
        },
        surge: {
            duration: 46,
            exit: { stop: 24, drain: 30 },
            emitters: [
                { name: "ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 30, at: 1 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.18, 0.3],
                    lifetime: [14, 24], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0xD86FC0, alpha: [0.6, 0], light: "full", maxParticles: 40 },
                { name: "veins", bind: "point", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "density", fallback: 26 }, shape: { kind: "circle", radius: 2.7 },
                    direction: "up", speed: [0.01, 0.05], spin: 12,
                    lifetime: [16, 28], size: [0.12, 0.04],
                    color: 0xE8B6E0, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 200 },
                { name: "motes", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 60, interval: 4, repeats: 6 }, shape: { kind: "circle", radius: 2.6 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.06, 0.02],
                    color: 0xE8B6E0, alpha: [0.6, 0], light: "full", maxParticles: 160 }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                { name: "edge", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 8, shape: { kind: "ring", radius: 3.2 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [20, 34], size: [0.4, 0.8], sizeMode: "sin",
                    color: 0xD86FC0, alpha: [0.32, 0], alphaMode: "sin", light: "full", maxParticles: 40 },
                { name: "film", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: { data: "density", fallback: 26 }, shape: { kind: "circle", radius: 3.2 },
                    direction: "up", speed: [0.002, 0.012], spin: 3,
                    lifetime: [16, 26], size: [0.1, 0.05],
                    color: 0x8A6FD0, alpha: [0.16, 0], alphaMode: "sin", light: "world", maxParticles: 120 },
                { name: "veins", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: { data: "density", fallback: 26 }, shape: { kind: "circle", radius: 2.7 },
                    direction: "up", speed: [0.01, 0.05], spin: 10,
                    lifetime: [18, 30], size: [0.09, 0.03],
                    color: 0xE8B6E0, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 180 }
            ]
        },
        jolt: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                { name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "surge", fallback: 10 }, at: 1 }, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 20], size: [0.2, 0.05],
                    color: 0xD86FC0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 30 }
            ]
        },
        brace: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                { name: "press", bind: "target", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.12, 0.26],
                    lifetime: [8, 16], size: [0.3, 0.6], sizeMode: "sin",
                    color: 0x8A6FD0, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 30 },
                { name: "dust", bind: "target", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xE8B6E0, alpha: [0.8, 0], light: "full", maxParticles: 24 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psychicterrain", 1, PsychicterrainDefinition);
