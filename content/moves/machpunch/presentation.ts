/**
 * 音速拳 / machpunch 的客户端表现。
 *
 * 一句话：拳锋在身前收拢成一记拳影，随后在目标身上炸开一道向前推开的压缩空气环与一记直拳的光影，
 *   拳影与环都向外一翻就散；挥空时前方只有一道没打中人的空环迅速消散。
 * 色相家族：暖琥珀（0xFFF0D0 / 0xF2A65A）做拳影，近白的冷蓝白（0xEAF2FF）只做音爆环，没有第二组饱和色。
 * 拍子：起 chamber（收拳聚力）→ 击 boom（音爆环 + 拳影）→ 收 whiff（空环消散）。
 * 范围：boom 绑命中点，环的半径就是 `data.boom`，玩家一眼看出这一拳的冲击张到多大；whiff 绑射线终点。
 * 运动：起手是向内收拢的拳影，命中是横向推开的一圈音爆与被拳风带飞的碎点，挥空是一圈向内塌掉的空气。
 * 数：boom 的拳影与碎点数量绑定 `data.count`（拳威力换算），音爆环的碎点数绑定 `data.ring`（速度换算），
 *   环的尺度绑定 `data.boom`（速度换算），亮度绑定 `data.intensity`（拳威力 / 60）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const MachpunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        chamber: {
            duration: { data: "windup", fallback: 1 },
            exit: { stop: 1, drain: 6 },
            emitters: [
                {
                    name: "fist", bind: "source", offset: [0, 0.45, 0.35], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    rate: 8, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.42, 0.14], sizeMode: "index",
                    color: 0xFFD9A0, alpha: [0.55, 0], light: "full", maxParticles: 18
                },
                {
                    name: "compress", bind: "source", offset: [0, 0.45, 0.3], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [4, 8], size: [0.16, 0.03],
                    color: 0xEAF2FF, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        boom: {
            duration: 24,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "shock", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "boom", fallback: 0.7 } },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [6, 12], size: [0.5, 1.7],
                    color: 0xEAF2FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 4
                },
                {
                    name: "fist", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.12 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.7, 0.95], sizeMode: "index",
                    color: 0xFFF0D0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 4
                },
                {
                    name: "impact", bind: "target", height: 0.42,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "count", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [5, 10], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFF0D0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 56
                },
                {
                    name: "driven", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "ring", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "boom", fallback: 0.7 } },
                    direction: "outward", speed: [0.1, 0.34], spread: 26,
                    lifetime: [5, 10], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFE9BC, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "empty", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/moves/sonicboom",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "boom", fallback: 0.7 } },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [5, 10], size: [0.45, 0.1],
                    color: 0xEAF2FF, alpha: [0.5, 0], light: "full", maxParticles: 4
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_machpunch", 1, MachpunchDefinition);
