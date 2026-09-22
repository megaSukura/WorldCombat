/**
 * 喷射拳 / jetpunch 的客户端表现。
 *
 * 一句话：水先拢上拳头、压成一股，随后一条水柱从拳上朝目标方向激射出去，命中处炸开一圈水花与气泡；
 *   带火的目标被浇出一团白汽；挥空时前方只有一蓬散水。
 * 色相家族：水蓝与青白（0x3FA8E0 / 0xBFE8F8），近白（0xF0FBFF）只给水柱核心；没有第二组饱和色。
 * 拍子：起 squeeze（拢水）→ 击 thrust（水柱激射）→ 中 hit（水花迸溅）／熄 douse（白汽）→ 空 whiff（散水）。
 * 范围：hit 的水花环半径由 `data.scale`（判定半径 / 0.42）给出，玩家看出这一拳的水花铺开多大一圈。
 * 运动：thrust 绑拳头、沿出拳方向（orient: direction）铺一条长度为 `data.reach` 的水柱；hit 的水花从落点向外炸、受重力。
 * 数：hit 与 thrust 的水花数量绑定 `data.spray`（速度／体重换算），亮度绑定 `data.intensity`（水柱威力换算），
 *   水柱长度绑定 `data.reach`（拳程换算）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const JetpunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        squeeze: {
            duration: { data: "windup", fallback: 1 },
            exit: { stop: 1, drain: 6 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [5, 10], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xBFE8F8, alpha: [0.6, 0], light: "full", maxParticles: 20
                },
                {
                    name: "beads", bind: "source", offset: [0, 0.5, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 10, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 9], size: [0.1, 0.02],
                    color: 0xEAF7FF, alpha: [0.6, 0], light: "full", maxParticles: 18
                }
            ]
        },
        thrust: {
            duration: 8,
            exit: { stop: 2, drain: 8 },
            emitters: [
                {
                    name: "jet", bind: "source", offset: [0, 0.5, 0.35], height: 0.5, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/water/waterjet_head",
                    rate: 70, shape: { kind: "line", length: { data: "reach", fallback: 2.8 } },
                    direction: "shape", speed: [0.05, 0.16],
                    lifetime: [4, 8], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xBFE8F8, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "streak", bind: "source", offset: [0, 0.5, 0.35], height: 0.5, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "line", length: { data: "reach", fallback: 2.8 } },
                    direction: "shape", speed: [0.04, 0.12],
                    lifetime: [4, 7], size: [0.2, 0.03],
                    color: 0xF0FBFF, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "water", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "spray", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [6, 11], size: [0.38, 0.05], sizeMode: "index",
                    color: 0xBFE8F8, alpha: [1, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "splash", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "spray", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.34], spread: 40, gravity: 0.04, drag: 0.98,
                    lifetime: [8, 14], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xEAF7FF, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.35, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [8, 14], size: [0.4, 0.12],
                    color: 0x6FC7EF, alpha: [0.6, 0], light: "full", maxParticles: 6
                }
            ]
        },
        douse: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "steam", bind: "point", fit: "none", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    burst: { count: 24, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.16],
                    lifetime: [10, 16], size: [0.34, 0.06], sizeMode: "sin",
                    color: 0xF0FBFF, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "spray", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.2, 0.03],
                    color: 0xBFE8F8, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_jetpunch", 1, JetpunchDefinition);
