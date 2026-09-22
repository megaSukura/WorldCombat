/**
 * 破灭之光 / lightofruin 的客户端表现。
 *
 * 一句话：施法者胸前绽开一朵苍白的花，花心迸出一根粗重的粉白光柱贯穿正前方；被贯穿的目标各自炸开一圈花瓣，
 * 随后一根反向的火沿来路烧回施法者身上——那条回烧就是「借来的力量要还」，玩家凭它认出反噬。
 * 色相家族：粉白到淡紫（glowingsparkle_pink 原色、impact_fairy 亮帧、bigsparkle／star 强调、tinydust 中性）。
 * 拍子：起 bloom（花朵绽开、蓄光）→ 放 ray（贯穿光柱）→ 中 impact（花瓣爆开）／ 空 fizzle（散光）→ 噬 recoil（回烧）。
 * 范围：ray 用 `data.path` 画出服务端走廊的同一组四个顶点——光柱有多长多粗、贯穿到哪，画面就是那根柱。
 * 运动：光柱沿走廊由近及远铺开、边缘同时向前扫；命中花瓣向外炸开；反噬层从身前沿来路反向缩回施法者。
 * 数：`data.notes`（威力换算）与 `data.intensity`（威力 / 140）决定光柱与命中的密度，`data.petals`（特攻与身高派生）
 * 决定花瓣与爆开数量，`data.pierce`（贯穿上限）决定边缘强调，`data.damage`（本次反噬量）决定回烧的强度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const LightofruinDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        bloom: {
            duration: 24,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "petals", bind: "source", offset: [0, 0.65, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 18, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xFFD9F0, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "core", bind: "source", offset: [0, 0.65, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 14, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.18, 0.04], sizeMode: "sin",
                    color: 0xFFF0FA, alpha: [0.75, 0], light: "full", bloom: 0.45, maxParticles: 50
                },
                {
                    name: "wish", bind: "source", offset: [0, 0.65, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    rate: { data: "petals", fallback: 28 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xF6D9FF, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        ray: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "lane_fill", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polygon" },
                    rate: { data: "notes", fallback: 120 }, direction: "shape", speed: [0.04, 0.2],
                    lifetime: [5, 10], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF1E4FF, alpha: [0.55, 0], light: "full", maxParticles: 440
                },
                {
                    name: "lane_glow", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    shape: { kind: "polygon" },
                    rate: { data: "petals", fallback: 28 }, direction: "shape", speed: [0.03, 0.16],
                    lifetime: [6, 12], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFBD4F0, alpha: [0.5, 0], light: "full", bloom: 0.35, maxParticles: 300
                },
                {
                    name: "lane_edge", bind: "path", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "pierce", fallback: 3 }, direction: "shape", spread: 10, speed: [0.06, 0.24],
                    lifetime: [5, 11], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFF3FF, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 220
                },
                {
                    name: "muzzle", bind: "source", offset: [0, 0.65, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.22], spread: 22,
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: { data: "petals", fallback: 28 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 24,
                    lifetime: [7, 13], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFF3FF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 150
                },
                {
                    name: "petal_burst", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "petals", fallback: 28 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.55 } },
                    direction: "outward", speed: [0.06, 0.24],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xF6C9EC, alpha: [0.75, 0], light: "full", maxParticles: 140
                }
            ]
        },
        recoil: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "backfire", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: { data: "count", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2], spread: 24,
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFD0E6, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 100
                },
                {
                    name: "scald", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "count", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.12], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xE8A9C8, alpha: [0.6, 0], light: "world", maxParticles: 90
                },
                {
                    name: "scald_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xE6B8D2, alpha: [0.45, 0], light: "world"
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "petals", fallback: 28 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0xD9C4D6, alpha: [0.35, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lightofruin", 1, LightofruinDefinition);
