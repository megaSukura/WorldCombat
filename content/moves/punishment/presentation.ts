/**
 * 惩罚 / punishment 的客户端表现。
 *
 * 一句话：施法者抬手称量，目标每涨过一层力量就朝它浮起一枚暗紫坠砣，随后一记压顶沿那条竖线砸下，
 *   落点炸开一圈按目标涨了多少决定的暗色爆。
 * 色相家族：暗紫（0x6E5AA8）作主体、深紫（0x46306E）作余韵、淡紫（0xC9B6FF）作强调；无第二个色相。
 * 拍子：起 weigh（称量浮砣）→ 判 fall（压顶竖线）→ 中 hit（暗色爆）／空 miss（空砸）。
 * 范围：fall 的竖线用 `data.path`（和服务端同一起止点）画成一条落线，目标就在它的下端。
 * 运动：坠砣在 weigh 阶段朝目标浮起，压顶沿竖线从上向下落，命中从落点向外炸。
 * 数：坠砣量绑 `data.weights`（目标能力等级 + 物攻换算），命中强度绑 `data.intensity`（本击威力 / 56）。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PunishmentDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        weigh: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "weigh", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/xsalphaboost",
                    burst: { count: { data: "weights", fallback: 8 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [6, 11], size: [0.11, 0.02], sizeMode: "index",
                    color: 0xC9B6FF, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 44
                }
            ]
        },
        fall: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "drop", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" }, burst: { count: { data: "weights", fallback: 8 } },
                    direction: "shape", orient: "direction", speed: [0.1, 0.26],
                    lifetime: [4, 8], size: [0.18, 0.04], sizeMode: "index",
                    color: 0x6E5AA8, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "judge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    shape: { kind: "polyline" }, burst: { count: 6, at: 0 },
                    direction: "shape", orient: "direction", speed: [0.06, 0.16],
                    lifetime: [4, 8], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xC9B6FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 20
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 7, drain: 11 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 9, at: 0 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "shape", speed: [0.07, 0.2], spread: 22,
                    lifetime: [4, 8], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xC9B6FF, alpha: [0.95, 0], light: "full", bloom: 0.4
                },
                {
                    name: "settle", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "weights", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16], spread: 26,
                    lifetime: [7, 13], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x46306E, alpha: [0.7, 0], gravity: 0.05, light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 14,
            exit: { stop: 5, drain: 9 },
            emitters: [
                {
                    name: "air", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "weights", fallback: 6 } },
                    shape: { kind: "cone", radius: 0.35, angleDegrees: 22 },
                    direction: "outward", speed: [0.05, 0.15],
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0x6E5AA8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_punishment", 1, PunishmentDefinition);
