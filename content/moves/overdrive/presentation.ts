/**
 * 破音 / overdrive 的客户端表现。
 *
 * 一句话：施法者把乐器提到身前、指尖噼啪聚电，随后连拨三下——每一下都先在身体上震出一圈可数的弦振，
 *   再把当刻整条音道的箱形线架齐鸣一次；被震到的人身上炸开电光、有时整个人被麻痹火花裹住；开余响时，
 *   三下之后同一条音道以暗淡的固定线架留着，隔一段再以更亮的迟到声浪齐鸣一次。
 * 色相家族：电金黄（0xF2D24A / electricity_yellow）与近白（0xFFF6C8 / electricity_white）为主体，
 *   爆点用纯白，麻痹只加蓝紫的 status/paralysis_spark 作「结果」记号。
 * 拍子：起 charge（聚电）→ 拨 riff（身体上的弦振，一拍一次）→ 鸣 pluck（当刻整条音道齐鸣）
 *   → 存 string（第三拨音道留下缓暗线架）→ 响 echo（原地再鸣那条旧线架）→ 击 hit 逐处轰中 → 麻 paralyze 结果。
 * 范围：pluck／echo／string 的 `data.path` 是服务端算出的音道箱形线架——长 `data.reach`、半宽 `data.half`、
 *   相对身体中心上下 `data.below`/`data.above`，与判定 `WorldGeometry.lane` 同一份尺寸；画到哪就震到哪。
 * 运动：charge 电花向内收；riff 在身体上拨出一圈；pluck／echo 沿线架齐鸣并向外跳电；hit 在目标身上向外炸。
 * 数：`data.arcs`（每下威力派生）决定电花密度，`data.struck`（本次命中数）决定过电的强度，`data.index` 标记演到第几下。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const OverdriveDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "spark", bind: "source", offset: [0, 0.6, 0.2], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.14], spread: 20,
                    lifetime: [6, 12], size: [0.2, 0.04],
                    color: 0xF2D24A, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "note", bind: "source", offset: [0, 0.7, 0.2], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 4, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08], spin: 20,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFFF6C8, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        riff: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "strum", bind: "source", offset: [0, 0.55, 0.2], height: 0.1, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 8, at: 0 }, shape: { kind: "arc", radius: 0.5, arcDegrees: 120 },
                    direction: "outward", speed: [0.08, 0.3], spread: 12,
                    lifetime: [4, 9], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.6, maxParticles: 40
                },
                {
                    name: "pluck", bind: "source", offset: [0, 0.5, 0.15], height: 0.1, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 6, at: 0 }, shape: { kind: "line", length: 0.6 },
                    direction: "shape", speed: [0.1, 0.34], spread: 8,
                    lifetime: [4, 8], size: [0.16, 0.03],
                    color: 0xF2D24A, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 30
                }
            ]
        },
        string: {
            duration: 0,
            exit: { stop: 0, drain: 18 },
            emitters: [
                {
                    name: "hold", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    shape: { kind: "polyline" },
                    rate: 6, direction: "shape", speed: [0.01, 0.05], spread: 4,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x8A7A2A, alpha: [0.35, 0], light: "world", maxParticles: 64
                },
                {
                    name: "hold_core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" },
                    rate: 4, direction: "shape", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0x9A8A3A, alpha: [0.3, 0], light: "world", maxParticles: 48
                }
            ]
        },
        pluck: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "arcs", fallback: 18 }, at: 0 },
                    direction: "shape", speed: [0.1, 0.32], spread: 16,
                    lifetime: [4, 9], size: [0.2, 0.03],
                    color: 0xF2D24A, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 240
                },
                {
                    name: "core", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "arcs", fallback: 18 }, at: 0 },
                    direction: "shape", speed: [0.08, 0.28], spread: 8,
                    lifetime: [4, 9], size: [0.24, 0.04],
                    color: 0xFFF6C8, alpha: [0.85, 0], light: "full", bloom: 0.6, maxParticles: 240
                },
                {
                    name: "dust", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "arcs", fallback: 18 }, at: 0 },
                    direction: "shape", speed: [0.04, 0.16], spread: 18, drag: 0.94,
                    lifetime: [7, 14], size: [0.06, 0.01],
                    color: 0xB8A050, alpha: [0.4, 0], light: "world", maxParticles: 180
                }
            ]
        },
        echo: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "return", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "arcs", fallback: 24 }, at: 0 },
                    direction: "shape", speed: [0.14, 0.4], spread: 10,
                    lifetime: [5, 11], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.7, maxParticles: 260
                },
                {
                    name: "edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "arcs", fallback: 24 }, at: 0 },
                    direction: "shape", speed: [0.1, 0.3], spread: 8,
                    lifetime: [8, 14], size: [0.2, 0.02],
                    color: 0xFFF6C8, alpha: [0.7, 0], light: "full", bloom: 0.5, maxParticles: 200
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 18 } }, amount: 2,
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.42], spread: 24,
                    lifetime: [5, 10], size: [0.42, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.55, maxParticles: 120
                },
                {
                    name: "jolt", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.2, 0.5], spread: 26,
                    lifetime: [6, 12], size: [0.16, 0.03],
                    color: 0xF2D24A, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 100
                }
            ]
        },
        paralyze: {
            duration: 24,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "lock", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 16, interval: 3, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.2], spread: 24,
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xC8A0FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_overdrive", 1, OverdriveDefinition);
