/**
 * 啄 / peck 的客户端表现。
 *
 * 一句话：缩颈蓄势时喙尖聚起一点冷白微光，随后一道贴身的短喙线向前点出，命中处炸开一小撮羽屑；
 * 若目标是空中的，还会有一线向下的拖痕把它压回地面。
 * 色相家族：冷白（0xFFFFFF）作喙尖强调、天青（0xCFE8FF／0x9FD6FF）作主体、灰白（0xB8C6D8）作余韵；无第二个色相。
 * 拍子：起 read（缩颈聚光）→ 啄 jab（短线点出）→ 击 hit（羽屑炸开）／落 plummet（向下拖痕）／空 whiff（乱羽）。
 * 范围：jab 的窄带用 `data.path`（与服务端 lane 同一组四个顶点）铺成一条短线，玩家一眼看出只有这条线会被啄到。
 * 运动：喙线沿 `data.direction` 一次点出，命中羽屑向外崩、plummet 的拖痕向目标下方走。
 * 数：羽屑量绑 `data.feathers`（物攻换算），命中强度绑 `data.intensity`（本击威力 / 34），喙线长度与尺寸绑 `data.scale`；
 *     plummet 的拖痕条数绑 `data.drives`（实际下压距离换算）——被抗性挡下时服务端根本不发这一刻，画面不会对不动的目标播被打落。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PeckDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 10,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "aim", bind: "source", offset: [0, 0.5, 0.3], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xCFE8FF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        jab: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: 8 },
                    direction: "shape", orient: "direction", speed: [0.08, 0.22],
                    lifetime: [4, 8], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xCFE8FF, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "tip", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    shape: { kind: "polyline" }, burst: { count: 6, at: 0 },
                    direction: "shape", orient: "direction", speed: [0.04, 0.14],
                    lifetime: [4, 8], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 20
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 7, drain: 11 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 8, at: 0 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.06, 0.2], spread: 20,
                    lifetime: [4, 8], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.35
                },
                {
                    name: "feathers", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    burst: { count: { data: "feathers", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18], spread: 26,
                    lifetime: [6, 12], size: [0.15, 0.03], sizeMode: "index",
                    color: 0xCFE8FF, alpha: [0.8, 0], gravity: 0.04, light: "world", maxParticles: 36
                }
            ]
        },
        plummet: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "drive", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "drives", fallback: 12 }, interval: 2, repeats: 2 },
                    shape: { kind: "line", length: 0.6 },
                    direction: "down", speed: [0.14, 0.34],
                    lifetime: [5, 9], size: [0.2, 0.04], sizeMode: "index",
                    color: 0x9FD6FF, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        whiff: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.4], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "feathers", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 20 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0xB8C6D8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_peck", 1, PeckDefinition);
