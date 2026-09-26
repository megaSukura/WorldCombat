/**
 * 日光束 / solarbeam 的客户端表现。
 *
 * 一句话：日光从头顶落下来、在施法者身上收成一小团，随后一束金白的光带沿直线铺出去、被方块截停在墙前，
 *         走廊里被贯穿的活体各自炸开一簇草绿的碎光。
 * 色相家族：金白（0xFFFBE8 近白的芯、0xFFD873 主体）＋中性尘；草绿（impact_grass）只作为命中点的小面积属性强调。
 * 拍子：起 gather（聚光）→ 击 beam（光带铺开）＋ pierce（贯穿点）＋ wall（墙前截停，或 fizzle 落空）→ 收（光带淡出）。
 * 范围：beam 用 path 画出服务端三维光带的四个顶点——光柱被墙截到哪里，画面与判定就到哪里。
 * 运动：光带一次铺满截断后的整条走廊、边缘同时扫；贯穿点在命中处向外炸开；墙前是一记贴在方块上的收束；聚光时光点由外向内收拢。
 * 数：`data.light`（日光与特攻换算）决定光带与聚光点的密度，`data.intensity`（威力/120）决定亮度，
 *     `data.pierce`（贯穿上限）决定边缘强调的强度，`data.scale`（半宽/0.62）决定光带与碎光的尺度。
 */
const SolarBeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 22 },
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather_sun", bind: "source", offset: [0, 1.5, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    rate: { data: "light", fallback: 14 }, shape: { kind: "sphere", radius: 0.75 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [8, 15], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0xFFD873, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "gather_motes", bind: "source", offset: [0, 0.9, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "light", fallback: 12 }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.14], spin: 10,
                    lifetime: [6, 13], size: [0.08, 0.02],
                    color: 0xFFF6C8, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "gather_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0xD8C48C, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        beam: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "beam_fill", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    shape: { kind: "polygon" },
                    rate: { data: "light", fallback: 16 }, direction: "shape", speed: [0.04, 0.18],
                    lifetime: [5, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFFBE8, alpha: [0.6, 0], light: "full", bloom: 0.45, maxParticles: 380
                },
                {
                    name: "beam_glow", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    shape: { kind: "polygon" },
                    rate: 40, direction: "shape", speed: [0.03, 0.14],
                    lifetime: [6, 13], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xFFD873, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 300
                },
                {
                    name: "beam_edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "pierce", fallback: 4 }, direction: "shape", spread: 8, speed: [0.06, 0.24],
                    lifetime: [5, 11], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 220
                },
                {
                    name: "muzzle", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "light", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 70
                }
            ]
        },
        pierce: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "pierce_core", bind: "point", offset: [0, 0.55, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "light", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.45 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [7, 13], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xEFFFC0, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "pierce_sear", bind: "point", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "light", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.45 } },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xC0A86A, alpha: [0.6, 0], light: "world", maxParticles: 120
                }
            ]
        },
        wall: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wall_flash", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "light", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.35 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    lifetime: [5, 10], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "wall_dust", bind: "point", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "light", fallback: 10 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.4 } },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xC0A86A, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fizzle_scatter", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.18, 0.05],
                    color: 0xD8C89C, alpha: [0.3, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fizzle_motes", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xFFE9A0, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_solarbeam", 1, SolarBeamDefinition);
