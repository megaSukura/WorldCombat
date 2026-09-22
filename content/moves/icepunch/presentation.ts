/**
 * 冰冻拳 / icepunch 的客户端表现。
 *
 * 一句话：拳面凝起一圈白霜，一拳按在目标身上炸开冰屑；目标脚下结起一层霜壳、体表泛出青蓝寒气；
 * 若寒霜已成，第二拳把霜壳收走，目标被一层厚冰壳裹住、动弹不得。
 * 色相家族：冰青（0x8FD8F0）与霜白（0xEAF8FF）；饱和青只出现在冰屑与霜壳的小面积。
 * 拍子：起 charge（凝霜）→ 击 hit（碎冰命中）→ 结 chill（结霜）/ freeze（冻实）与 whiff（空拳）。
 * 范围：chill／freeze 绑在目标身上，画的是被作用的那个人；近身直线判定由命中瞬间的冰屑朝向读出。
 * 运动：冰屑从拳面朝目标迸出，霜壳从命中点沿目标体表向上漫。
 * 数：冰屑数绑 `data.shards`（特攻换算），冻结强度绑 `data.intensity`，是否浸水由 `data.wet` 加一层贴地霜。
 */
const IcepunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "frost", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 11], size: [0.22, 0.05],
                    color: 0xEAF8FF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "ground", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 8, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.1, 0.03],
                    color: 0x8FD8F0, alpha: [0.6, 0], gravity: 0.02, drag: 0.94, light: "world", maxParticles: 30
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.06, 0.22], spread: 24,
                    lifetime: [5, 10], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45
                },
                {
                    name: "shards", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 6 }, interval: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2], spread: 26,
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xEAF8FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        chill: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "coat", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: { data: "shards", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.16, 0.04], sizeMode: "index",
                    color: 0x8FD8F0, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "glow", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    rate: 6, shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xEAF8FF, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        freeze: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "shell", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 6 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [12, 20], size: [0.26, 0.06], sizeMode: "index",
                    color: 0x8FD8F0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "glint", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 8, interval: 3 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xEAF8FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "floor", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.12, 0.03],
                    color: 0x8FD8F0, alpha: [0.7, 0], gravity: 0.01, drag: 0.95, light: "world", maxParticles: 40
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.35], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 12, interval: 2 },
                    shape: { kind: "cone", radius: 0.5, angleDegrees: 32 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [5, 10], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xEAF8FF, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_icepunch", 1, IcepunchDefinition);
