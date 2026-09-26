/**
 * 浊流 / muddywater 的客户端表现。
 *
 * 一句话：脚边先涌起一圈浑水与泥泡，随后一道低矮的褐色泥浪贴着地面向前抹出去，扫过的地方泥点沉降、
 *   命中的人当场炸开泥花、眼睛里挂上泥点，浪推完地面留下一层湿泥的浮尘。
 * 色相家族：泥褐（0x6B5A3E）与淤土黄（0x8E7B5A / 0x9C8A66）；近白只出现在溅起的那一下高光。
 * 拍子：起 gather（囤浑水）→ 涌 surge（泥浪按步推进）→ 击 hit（炸开泥花）／ 空 miss → 沉 silt → 收 linger／clear。
 * 范围：surge 用 `data.path`（与服务端同一个扇环多边形，内弧/外弧即当步的 inner/outer）画成面，
 *   玩家看到泥浪铺到哪就知道站哪会被糊到；判定与这条前沿读同一组顶点。
 * 运动：泥浪沿地面一步步向前推，`data.path` 每一刻都被替换成当前那一圈扇环；泥点带轻微重力往下沉。
 * 数：`data.drops`（特攻＋等级换算的泥点数量）绑定发射量，`data.intensity`（泥浪威力 / 90）放大整幕，
 *   `data.scale` 让大个子的泥浪更粗，`data.film` 决定地面上短泥膜的碎点数，`data.density` 决定糊眼期间
 *   头顶下坠泥点的疏密；泥膜不替换任何方块，只按 `data` 里的时长自然散去。
 */

const MuddywaterDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "swirl", bind: "source", offset: [0, 0.3, 0.35], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: { data: "drops", fallback: 18 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 14], size: [0.16, 0.03],
                    color: 0x7A6B4A, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "bubbles", bind: "source", offset: [0, 0.22, 0.35], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: 14, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x6B5A3E, alpha: [0.7, 0], light: "world", maxParticles: 44
                }
            ]
        },
        surge: {
            duration: 0,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "band", bind: "path", fit: "none", shape: { kind: "polygon" },
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    rate: { data: "drops", fallback: 18 },
                    direction: "up", speed: [0.03, 0.11], spread: 14,
                    gravity: 0.035, drag: 0.9,
                    lifetime: [10, 18], size: [0.22, 0.04],
                    color: 0x6B5A3E, alpha: [0.8, 0], light: "world", maxParticles: 260
                },
                {
                    name: "crest", bind: "path", fit: "none", shape: { kind: "polyline", closed: true },
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    rate: { data: "drops", fallback: 18 },
                    direction: "up", speed: [0.05, 0.16], spread: 12,
                    gravity: 0.02, drag: 0.92,
                    lifetime: [8, 15], size: [0.32, 0.06], sizeMode: "index",
                    color: 0x9C8A66, alpha: [0.6, 0], light: "full", maxParticles: 160
                },
                {
                    name: "haze", bind: "path", fit: "none", shape: { kind: "polygon" },
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: { data: "drops", fallback: 18 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0x8E7B5A, alpha: [0.35, 0], light: "world", maxParticles: 180
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "splash", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "drops", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.24], spread: 26,
                    lifetime: [6, 11], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "clods", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: { data: "drops", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x6B5A3E, alpha: [0.85, 0], light: "world", maxParticles: 100
                }
            ]
        },
        silt: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "settle", bind: "path", fit: "none", shape: { kind: "polygon" },
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    rate: { data: "drops", fallback: 18 },
                    direction: "up", speed: [0.01, 0.05],
                    gravity: 0.03, drag: 0.9,
                    lifetime: [14, 26], size: [0.06, 0.01],
                    color: 0x6B5A3E, alpha: [0.4, 0], light: "world", maxParticles: 200
                },
                {
                    name: "puff", bind: "path", fit: "none", shape: { kind: "polygon" },
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "film", fallback: 20 }, at: 1 },
                    direction: "up", speed: [0.02, 0.1], spread: 20,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x9C8A66, alpha: [0.6, 0], light: "world", maxParticles: 140
                }
            ]
        },
        linger: {
            duration: 0,
            emitters: [
                {
                    name: "murk", bind: "target", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: { data: "density", fallback: 6 }, shape: { kind: "circle", radius: 0.35 },
                    direction: "down", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.08, 0.02],
                    color: 0x6B5A3E, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        clear: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "wipe", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.14], spread: 28,
                    drag: 0.92,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x8E7B5A, alpha: [0.7, 0], light: "world", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "dud", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/mud/mudsplash",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14], spread: 12,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 16], size: [0.08, 0.02],
                    color: 0x6B5A3E, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_muddywater", 1, MuddywaterDefinition);
