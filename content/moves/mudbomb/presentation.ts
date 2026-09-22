/**
 * 泥巴炸弹 / mudbomb 的客户端表现。
 *
 * 一句话：一颗硬泥弹在身前压实后直线飞出，砸中目标炸开成泥雾，泥块向四周泼溅、地上落下一片湿泥。
 * 色相家族：干泥的深棕（0x5C4A34）与浅褐（0x8E6E4A），碎屑收在灰白。
 * 拍子：起 gather（压实收紧）→ 击 burst（炸开）与 spray（泼溅到旁人）→ 收 face（中招者脸上的泥雾）与地面泥坑。
 * 范围：burst 的 ring 半径由 `data.blast`（机制爆开半径）铺开，玩家一眼看出波及到哪。
 * 运动：泥弹沿直线飞行（服务端速度），炸开后泥块受重力向外抛。
 * 数：burst/spray 的泥块数绑定 `data.shards`（特攻与等级换算），强度绑定 `data.intensity`（威力 / 65）。
 */
const MudbombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "pack", bind: "source", offset: [0, 0.4, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/moves/mudbomb",
                    rate: 6, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.08, 0.2],
                    lifetime: [8, 14], size: [0.34, 0.2],
                    color: 0x5C4A34, alpha: [0.85, 0.15], light: "world", maxParticles: 20
                },
                {
                    name: "spin_dust", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.1, 0.24],
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0x8E6E4A, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        flight: {
            emitters: [
                {
                    name: "ball", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/moves/mudbomb",
                    trail: { minDistance: 0.3 }, rate: 22,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 10], size: [0.32, 0.2],
                    color: 0x5C4A34, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "grit", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.2 }, rate: { data: "shards", fallback: 24 },
                    direction: "velocity", speed: [0.0, 0.05], spread: 22,
                    gravity: 0.02, drag: 0.94,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0x8E6E4A, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "blast_ring", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "blast", fallback: 2 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [12, 20], size: [0.4, 0.9],
                    color: 0x5C4A34, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "clods", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    burst: { count: { data: "shards", fallback: 16 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.18, 0.5], spread: 25,
                    gravity: 0.045, drag: 0.9,
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x5C4A34, alpha: [0.95, 0], light: "world", maxParticles: 80
                },
                {
                    name: "dust_cloud", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shards", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.34], spread: 30,
                    gravity: 0.02, drag: 0.88,
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0x8E6E4A, alpha: [0.7, 0], light: "world", maxParticles: 120
                }
            ]
        },
        spray: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "spray_clods", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.28], spread: 26,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 15], size: [0.13, 0.02],
                    color: 0x5C4A34, alpha: [0.9, 0], light: "world", maxParticles: 50
                }
            ]
        },
        face: {
            duration: 70,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "mud_veil", bind: "target", offset: [0, 0.9, 0], height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble", spriteFrom: "random",
                    rate: 3, shape: { kind: "sphere", radius: 0.26 },
                    direction: "down", speed: [0.0, 0.015],
                    lifetime: [16, 30], size: [0.16, 0.05],
                    color: 0x5C4A34, alpha: [0.8, 0.15], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mudbomb", 1, MudbombDefinition);
