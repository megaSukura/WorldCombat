/**
 * 电力上升 / risingvoltage 的客户端表现。
 *
 * 一句话：施法者顿足、脚边地纹亮起（起）→ 一条电流沿地面窜到对手脚下（爬）→ 落点从地里竖起一根电柱，
 *   把站在上面的人从下往上击穿，脚下带电的目标那一下更粗更亮（升）。
 * 色相家族：电黄到近白（0xF8D030／0xFFE84D 为主体，0xFFFFFF 只做放电强调，余韵是焦土暗黄）。
 * 拍子：起（coil 蓄电）→ 击（crawl 爬行、pillar 升柱、hit 贯穿）→ 收（暗黄残尘）。
 * 范围：电柱按服务端 `data.radius`／`data.height`（真实粗细与高度）画出，柱身以内就是会被贯穿的地方。
 * 运动：电流沿 `data.path`（每刻由服务端把前端推进到新的位置）贴着地面生长，前端端点始终等于锁定的柱底；
 *   柱底不随目标横移。带电目标的那一柱在 pillar 上多出一层更亮更粗的电荷壳。
 * 数：`data.arcs`（特攻派生的电弧数）决定电柱与爬线的密度，`data.intensity`／`data.charged`（是否带电）决定明暗与粗细，
 *   画面里的数与机制里的数一致。
 */
const RisingVoltageDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "foot_arc", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "overcharge", fallback: 14 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.2], spin: 18,
                    lifetime: [5, 11], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFFE84D, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "leg_arc", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 10, shape: { kind: "cylinder", radius: 0.4, length: 0.7 },
                    direction: "up", speed: [0.02, 0.1], spin: 20,
                    lifetime: [4, 9], size: [0.09, 0.02],
                    color: 0xFFF3B0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        crawl: {
            duration: 40,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "arcs", fallback: 18 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.1], spin: 16,
                    lifetime: [4, 9], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFE84D, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "sparks", bind: "path", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 20, trail: { minDistance: 0.4 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [5, 11], size: [0.06, 0.01],
                    color: 0xFFF6C0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "dust", bind: "path", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, trail: { minDistance: 0.35 }, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xB8A24C, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        },
        pillar: {
            duration: 40,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "column", bind: "point", fit: "none", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 18 }, interval: 2, repeats: 4 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.1 }, length: { data: "height", fallback: 3.6 } },
                    direction: "up", speed: [0.12, 0.45], spin: 22, spread: 12,
                    lifetime: [5, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFE84D, alpha: [0.95, 0], light: "full", bloom: 0.45, maxParticles: 200
                },
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "arcs", fallback: 18 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.1 }, length: { data: "height", fallback: 3.6 } },
                    direction: "up", speed: [0.05, 0.25], spread: 8,
                    lifetime: [4, 10], size: [0.12, 0.03],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 140
                },
                {
                    name: "charged_shell", bind: "point", fit: "none", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "charged", fallback: 0 }, interval: 2, repeats: 3 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.1 }, length: { data: "height", fallback: 3.6 } },
                    direction: "up", speed: [0.1, 0.4], spin: 26, spread: 14,
                    lifetime: [5, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFF6C0, alpha: [0.95, 0], light: "full", bloom: 0.55, maxParticles: 160
                },
                {
                    name: "ground_shock", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.1 } },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [8, 16], size: [0.5, 0.22],
                    color: 0xC8A83A, alpha: [0.7, 0], light: "world", maxParticles: 20
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 4, interval: 1, repeats: 2 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.1, 0.36], spread: 26,
                    lifetime: [7, 14], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 24
                },
                {
                    name: "charged_arc", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "charged", fallback: 0 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0xFFF6C0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_risingvoltage", 1, RisingVoltageDefinition);
