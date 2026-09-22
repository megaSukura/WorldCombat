/**
 * 随机光 / ficklebeam 的客户端表现。
 *
 * 一句话：施法者身前聚起几股明灭不定的龙光，随后一束细长的光沿准线射出去；命中处如果所有的光股一起亮起，
 * 就是那一次翻倍的齐射——玩家能靠光束里的股数和命中处的爆亮认出中没中。它没有自损，代价全押在这一掷。
 * 色相家族：青蓝到紫（glowingsparkle／glowing_dots_cyan 原色、impact_dragon 亮帧、star 强调），核心近白。
 * 拍子：起 gather（聚光、明灭）→ 射 beam（光束走廊）→ 中 hit／齐心 unison（爆亮）／ 空 fizzle（散光）。
 * 范围：beam 用 `data.path` 画出服务端走廊的同一组四个顶点——光柱有多长多宽，画面就是那条光。
 * 运动：光束沿走廊由近及远铺开；`data.strands` 条股线沿同一方向掠过；齐射时命中处爆亮并泛起更大的环。
 * 数：`data.notes`（威力换算）决定光柱密度，`data.strands`（齐射＝股数，否则 1）决定股线数量，
 * `data.heads`（体型派生）与 `data.intensity`（威力 / 80）决定齐射爆开的强度，`data.motes` 决定散点数量。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FicklebeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "flicker", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x9AD8FF, alpha: [0.75, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "orb", bind: "source", offset: [0, 0.65, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0x8FC7FF, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "strand_hint", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: { data: "heads", fallback: 2 }, shape: { kind: "ring", radius: 0.24 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xC9E6FF, alpha: [0.65, 0], light: "full", bloom: 0.35, maxParticles: 30
                }
            ]
        },
        beam: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "lane_fill", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "polygon" },
                    rate: { data: "notes", fallback: 90 }, direction: "shape", speed: [0.04, 0.2],
                    lifetime: [5, 10], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xBFE0FF, alpha: [0.55, 0], light: "full", bloom: 0.35, maxParticles: 360
                },
                {
                    name: "lane_glow", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    shape: { kind: "polygon" },
                    rate: 70, direction: "shape", speed: [0.03, 0.16],
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x9CCBFF, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 260
                },
                {
                    name: "strands", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    shape: { kind: "polyline" },
                    rate: { data: "strands", fallback: 1 }, direction: "shape", speed: [0.05, 0.22],
                    lifetime: [5, 11], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xDFF1FF, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 160
                },
                {
                    name: "muzzle", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "heads", fallback: 2 }, at: 0, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [6, 11], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 70
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "motes", fallback: 30 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.4 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF4FF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 140
                },
                {
                    name: "sparks", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 30 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.42 } },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [9, 16], size: [0.09, 0.02],
                    color: 0x9AD8FF, alpha: [0.8, 0], light: "full", maxParticles: 160
                }
            ]
        },
        unison: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "heads", fallback: 2 }, at: 0, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.08, 0.3], spread: 26,
                    lifetime: [8, 15], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 220
                },
                {
                    name: "all_heads", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: { data: "heads", fallback: 2 }, at: 0, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.45 } },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0xC9E6FF, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 120
                },
                {
                    name: "shock", bind: "target", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 26, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 16], size: [0.34, 0.1],
                    color: 0xAFD6F0, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 30 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x8FBDE0, alpha: [0.4, 0], light: "full", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ficklebeam", 1, FicklebeamDefinition);
