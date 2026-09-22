/**
 * 破音 / overdrive 的客户端表现。
 *
 * 一句话：施法者把乐器提到身前、指尖噼啪聚电，随后朝正前方连拨三下——每一下都沿同一条走廊推出一道
 *   金白的电声浪，走廊边缘跳着电花，被震到的人身上炸开电光、有时整个人被麻痹火花裹住；开余响时，
 *   三下之后还会回来一记更亮的迟到声浪。
 * 色相家族：电金黄（0xF2D24A / electricity_yellow）与近白（0xFFF6C8 / electricity_white）为主体，
 *   爆点用纯白，麻痹只加蓝紫的 status/paralysis_spark 作「结果」记号。
 * 拍子：起（charge 聚电）→ 拨（pluck 一拍拍扫过走廊）→ 击（hit 逐处轰中）→ 麻（paralyze 结果）→ 响（echo 迟到声浪）。
 * 范围：pluck／echo 的走廊用服务端传的 `data.path`（与判定 `WorldGeometry.lane` 同一组四角顶点）铺出，
 *   `data.reach` 与 `data.half` 是同一份长度与半宽——画到哪就是会被震到哪。
 * 运动：charge 电花向内收；pluck／echo 电声沿 `data.direction` 从身上推出去、边缘电花跳着走；hit 在目标身上向外炸。
 * 数：`data.arcs`（每下威力派生）决定电花密度，`data.struck`（本次命中数）决定过电的强度，
 *   `data.index` 标记演到第几下。
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
        pluck: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "thrum", bind: "path", offset: [0, 0.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polygon" },
                    rate: { data: "arcs", fallback: 18 }, direction: "shape", speed: [0.08, 0.26], spread: 8,
                    lifetime: [5, 10], size: [0.24, 0.04],
                    color: 0xFFF6C8, alpha: [0.8, 0], light: "full", bloom: 0.6, maxParticles: 220
                },
                {
                    name: "edge", bind: "path", offset: [0, 0.35, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "arcs", fallback: 18 }, direction: "shape", speed: [0.1, 0.3], spread: 14,
                    lifetime: [4, 9], size: [0.12, 0.02],
                    color: 0xF2D24A, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 200
                },
                {
                    name: "riff_core", bind: "source", offset: [0, 0.55, 0.2], height: 0.1, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 10, at: 0 }, shape: { kind: "line", length: { data: "reach", fallback: 6.5 } },
                    direction: "shape", speed: [0.1, 0.34], spread: 10,
                    lifetime: [5, 10], size: [0.4, 0.1], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.6, maxParticles: 60
                },
                {
                    name: "dust", bind: "path", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: { data: "arcs", fallback: 18 }, direction: "outward", speed: [0.05, 0.18], spread: 18, drag: 0.94,
                    lifetime: [7, 14], size: [0.06, 0.01],
                    color: 0xB8A050, alpha: [0.4, 0], light: "world", maxParticles: 160
                }
            ]
        },
        echo: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "return", bind: "path", offset: [0, 0.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polygon" },
                    rate: { data: "arcs", fallback: 24 }, direction: "shape", speed: [0.14, 0.4], spread: 10,
                    lifetime: [5, 11], size: [0.3, 0.06],
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.7, maxParticles: 260
                },
                {
                    name: "edge", bind: "path", offset: [0, 0.35, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "arcs", fallback: 24 }, direction: "shape", speed: [0.1, 0.3], spread: 8,
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
