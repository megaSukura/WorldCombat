/**
 * 神奇蒸汽 / strangesteam 的客户端表现。
 *
 * 一句话：施法者气孔里把蒸汽收成一点粉白 → 朝落点喷出一柱翻腾的白汽 → 落点摊开一片低垂的粉白蒸汽云，
 * 云里被喷到的人身上炸开粉色蒸汽冲击；被迷住的人身侧一直在冒没散尽的汽。
 * 色相家族：仙粉（0xE89AC8 主 / 0xF0C8E0 亮 / 0xFFFFFF 高光），近白只给喷流核心。
 * 拍子：起 gather（收汽）→ 喷 jet（汽柱）→ 开 bloom（云落下）→ 云 cloud（持续翻滚）
 *   → 击 hit（首喷）→ 熏 sear（续熏）→ 果 linger（身侧冒汽）。
 * 范围：cloud 与 bloom 的贴地圆盘半径直接绑定 `data.radius`（实际云半径），画出的就是判定罩到的范围。
 * 运动：gather 向内收；jet 沿 `data.direction` 拉出一条汽柱（`orient: direction`）；cloud 贴地翻滚上升。
 * 数：`data.motes`（特攻与等级派生）决定汽柱与云里翻滚的汽点密度，命中强弱按 `data.scale` 抬高。
 */
const StrangesteamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "gather_steam", bind: "source", offset: [0, 0.05, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    rate: 18, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0xF0C8E0, alpha: [0.35, 0], light: "world", maxParticles: 34
                },
                {
                    name: "gather_spark", bind: "source", offset: [0, 0.05, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xE89AC8, alpha: [0.8, 0], light: "full", maxParticles: 22
                }
            ]
        },
        jet: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "jet_core", bind: "source", fit: "none", offset: [0, 0.4, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    rate: { data: "motes", fallback: 30 }, shape: { kind: "line", length: { data: "distance", fallback: 6 } },
                    direction: "shape", speed: [0.12, 0.3],
                    lifetime: [8, 16], size: [0.2, 0.04],
                    color: 0xF0C8E0, alpha: [0.45, 0], light: "world", maxParticles: 120
                },
                {
                    name: "jet_spark", bind: "source", fit: "none", offset: [0, 0.4, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "motes", fallback: 16 }, shape: { kind: "line", length: { data: "distance", fallback: 6 } },
                    direction: "shape", speed: [0.1, 0.26],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 80
                }
            ]
        },
        bloom: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.8 } },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [10, 18], size: [0.3, 0.7],
                    color: 0xE89AC8, alpha: [0.6, 0], light: "full", maxParticles: 8
                },
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    burst: { count: { data: "motes", fallback: 20 } },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.8 } },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.2, 0.05],
                    color: 0xF0C8E0, alpha: [0.4, 0], light: "world", maxParticles: 90
                }
            ]
        },
        cloud: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "cloud_steam", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    rate: { data: "motes", fallback: 24 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1.8 } },
                    direction: "up", speed: [0.01, 0.05], drag: 0.92,
                    lifetime: [16, 28], size: [0.22, 0.05],
                    color: 0xFFFFFF, alpha: [0.3, 0], light: "world", maxParticles: 120
                },
                {
                    name: "cloud_pink", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "motes", fallback: 12 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1.8 } },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0xE89AC8, alpha: [0.5, 0], light: "full", maxParticles: 60
                },
                {
                    name: "cloud_low", bind: "point", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: { data: "motes", fallback: 8 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1.8 } },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xF0C8E0, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.1, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "steam", bind: "target", offset: [0, 0.1, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xF0C8E0, alpha: [0.55, 0], light: "world", maxParticles: 50
                }
            ]
        },
        sear: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "sear_steam", bind: "target", offset: [0, 0.15, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xE89AC8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        linger: {
            exit: { drain: 34 },
            emitters: [
                {
                    name: "linger_steam", bind: "target", offset: [0, 0.1, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 3, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 28], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xF0C8E0, alpha: [0.28, 0], alphaMode: "sin", light: "world", maxParticles: 12
                },
                {
                    name: "linger_spark", bind: "target", offset: [0, 0.12, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 3, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.06, 0.01],
                    color: 0xE89AC8, alpha: [0.3, 0], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_strangesteam", 1, StrangesteamDefinition);
