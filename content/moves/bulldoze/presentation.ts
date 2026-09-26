/**
 * 重踏 / bulldoze 的客户端表现。
 *
 * 一句话：施法者抬脚、脚边卷起石屑，重踏落地后一圈地裂贴着地表向外推开，经过的每一处都激起尘土与碎石，
 * 全部落定后波前留下一道薄裂缝再散去；地面方块本身不会被替换。
 * 色相家族：土黄与石灰（earth / large_rock / tinydust / groundquake）为主体，近白只做重踏那一下的高光。
 * 拍子：起（stomp 抬脚聚屑）→ 击（slam 落地、wave 地裂推进、hit 逐处溅屑）→ 收（crack 波前余痕 / miss 落空）。
 * 范围：wave 的环按服务端传的 `data.inner`/`data.radius`（本圈真实内外沿）画出薄带，玩家看到的圈就是会被扫到的地。
 * 运动：地裂从脚下沿地表一圈圈向外推，`progress` 配合 `radius` 让同一发射器逐轮变大。
 * 数：`data.flow`（半径派生）决定环上密度，`data.count`（威力派生）决定落点碎屑量，`data.marks` 决定重踏高光。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BulldozeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        stomp: {
            duration: 14,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08], spread: 14,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x8A7A62, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.02, 0.09],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x6E5A44, alpha: [0.5, 0], light: "world", maxParticles: 44
                }
            ]
        },
        slam: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "impact", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "marks", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [7, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE8DFC8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "clods", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "marks", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.1, 0.4], spread: 30,
                    gravity: 0.06, drag: 0.94,
                    lifetime: [12, 22], size: [0.16, 0.04],
                    color: 0x9A8A72, alpha: [0.9, 0], light: "world", maxParticles: 80
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "marks", fallback: 14 }, at: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.24], spread: 14,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        wave: {
            duration: 12,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "front", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    rate: { data: "flow", fallback: 70 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.2 },
                        innerRadius: { data: "inner", fallback: 0 }, outerRadius: { data: "radius", fallback: 3.2 } },
                    direction: "outward", speed: [0.02, 0.08], spread: 8,
                    lifetime: [10, 16], size: [0.5, 0.9], sizeMode: "linear",
                    color: 0xA08C6E, alpha: [0.75, 0], light: "world", maxParticles: 120
                },
                {
                    name: "spray", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "flow", fallback: 50 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.2 },
                        innerRadius: { data: "inner", fallback: 0 }, outerRadius: { data: "radius", fallback: 3.2 } },
                    direction: "outward", speed: [0.05, 0.18], spread: 16,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 140
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.26], spread: 18,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF0E8D8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "clods", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "count", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.34], spread: 30,
                    gravity: 0.07, drag: 0.94,
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0x8A7A62, alpha: [0.85, 0], light: "world", maxParticles: 60
                }
            ]
        },
        crack: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "scar_dust", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "flow", fallback: 40 }, shape: { kind: "ring", radius: { data: "radius", fallback: 3.2 }, thickness: 0.5 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [14, 26], size: [0.05, 0.01],
                    color: 0x6E5A44, alpha: [0.35, 0], light: "world", maxParticles: 120
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "marks", fallback: 20 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3.2 }, thickness: 0.6 },
                    direction: "up", speed: [0.02, 0.1], spread: 22,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [12, 24], size: [0.08, 0.02],
                    color: 0x9A8A72, alpha: [0.7, 0], light: "world", maxParticles: 90
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "scuff", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bulldoze", 1, BulldozeDefinition);
