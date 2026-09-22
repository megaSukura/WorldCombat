/**
 * 飞水手里剑 / watershuriken 的客户端表现。
 *
 * 一句话：水先在掌中旋成一枚发亮的水盘，随后一枚接一枚的旋转水星沿直线甩出去，每枚命中都炸开一圈水花与气泡；
 *   甩完最后收势。
 * 色相家族：水蓝与青白（0x4FB8E8 / 0xBFE8F8），近白（0xF0FBFF）只给水星核心；没有第二组饱和色。
 * 拍子：起 gather（旋水成盘）→ 掷 volley（水星离手）／飞 fly（水星尾迹）→ 中 hit（水花迸溅）→ 收 settle（合掌收势）。
 * 范围：hit 的水花环半径由 `data.scale`（判定半径 / 0.35）给出，玩家看出每一枚水星切中多大一圈。
 * 运动：fly 绑每一枚水星投射物、沿飞行方向拖出尾迹；hit 的水花从落点向外炸开、受重力。
 * 数：hit 与 volley 的水花数量绑定 `data.sparks`（特攻换算），亮度绑定 `data.intensity`（单枚威力换算），
 *   水星数量绑定 `data.stars`（数据决定的枚数）——散式画面上就是更密的一串。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const WatershurikenDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 3 },
            exit: { stop: 1, drain: 8 },
            emitters: [
                {
                    name: "wheel", bind: "source", offset: [0, 0.6, 0.35], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1], spin: 12,
                    lifetime: [5, 10], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xBFE8F8, alpha: [0.7, 0], light: "full", maxParticles: 20
                },
                {
                    name: "beads", bind: "source", offset: [0, 0.6, 0.35], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 14, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 9], size: [0.1, 0.02],
                    color: 0xEAF7FF, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        },
        volley: {
            duration: 10,
            exit: { stop: 2, drain: 8 },
            emitters: [
                {
                    name: "launch", bind: "source", offset: [0, 0.6, 0.35], height: 0.6, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 3, at: 0 },
                    shape: { kind: "line", length: 0.5 },
                    direction: "shape", speed: [0.06, 0.16], spin: 18,
                    lifetime: [4, 8], size: [0.22, 0.06], sizeMode: "index",
                    color: 0xF0FBFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 12
                }
            ]
        },
        fly: {
            duration: 0,
            exit: { stop: 0, drain: 8 },
            emitters: [
                {
                    name: "trail", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    trail: { minDistance: 0.3 }, rate: 40, shape: { kind: "sphere", radius: 0.12 },
                    direction: "shape", speed: [0.01, 0.05],
                    lifetime: [5, 9], size: [0.1, 0.02],
                    color: 0xBFE8F8, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "water", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "sparks", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [6, 11], size: [0.32, 0.04], sizeMode: "index",
                    color: 0xBFE8F8, alpha: [1, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "splash", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "sparks", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.1, 0.32], spread: 42, gravity: 0.04, drag: 0.98,
                    lifetime: [8, 13], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xEAF7FF, alpha: [0.9, 0], light: "world", maxParticles: 70
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.38, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.13],
                    lifetime: [8, 13], size: [0.34, 0.1],
                    color: 0x6FC7EF, alpha: [0.55, 0], light: "full", maxParticles: 6
                }
            ]
        },
        settle: {
            duration: 18,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "rest", bind: "source", offset: [0, 0.6, 0.35], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xEAF7FF, alpha: [0.7, 0], light: "full", maxParticles: 24
                },
                {
                    name: "water", bind: "source", offset: [0, 0.6, 0.35], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [8, 13], size: [0.16, 0.03],
                    color: 0xBFE8F8, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_watershuriken", 1, WatershurikenDefinition);
