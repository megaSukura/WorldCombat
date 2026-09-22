/**
 * 逐步击破 / chipaway 的客户端表现。
 *
 * 一句话：压低身位、拳前亮起三点微光，随后沿身前那条击打线接连点出几拍，每一拍停在不同的高度，
 *   命中处炸开一小撮碎屑。
 * 色相家族：暖白（0xF2EFE6）作主体、灰米（0xD8D2C4）作细节、亮白（0xFFFFFF）作拳尖强调；无第二个色相。
 * 拍子：起 read（压步聚光）→ 击 beat（分高度的连击线）→ 中 hit（碎屑炸开）／空 miss（乱尘）。
 * 范围：beat 的窄带用 `data.path`（与服务端 lane 同一组四个顶点）画成击打线，那道线就是判定范围。
 * 运动：连击线沿 `data.direction` 一次点出，命中碎屑向外崩落。
 * 数：碎屑量绑 `data.chips`（物攻换算），命中强度绑 `data.intensity`（每拍威力 / 20），线长与尺寸绑 `data.scale`。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ChipawayDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 10,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "stance", bind: "source", offset: [0, 0.5, 0.28], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 9, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xF2EFE6, alpha: [0.65, 0], light: "full", bloom: 0.3, maxParticles: 20
                }
            ]
        },
        beat: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: { data: "chips", fallback: 12 } },
                    direction: "shape", orient: "direction", speed: [0.06, 0.18],
                    lifetime: [4, 8], size: [0.15, 0.03], sizeMode: "index",
                    color: 0xF2EFE6, alpha: [0.55, 0], light: "world", maxParticles: 34
                },
                {
                    name: "knuckle", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    shape: { kind: "polyline" }, burst: { count: 6, at: 0 },
                    direction: "shape", orient: "direction", speed: [0.04, 0.12],
                    lifetime: [4, 8], size: [0.17, 0.03], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 18
                }
            ]
        },
        hit: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 7, at: 0 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "shape", speed: [0.06, 0.18], spread: 20,
                    lifetime: [4, 8], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.35
                },
                {
                    name: "chips", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "chips", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.16], spread: 24,
                    lifetime: [6, 12], size: [0.13, 0.03], sizeMode: "index",
                    color: 0xD8D2C4, alpha: [0.75, 0], gravity: 0.04, light: "world", maxParticles: 36
                }
            ]
        },
        miss: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0.4], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "chips", fallback: 8 } },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 20 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0xD8D2C4, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_chipaway", 1, ChipawayDefinition);
