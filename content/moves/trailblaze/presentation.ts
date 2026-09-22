/**
 * 起草 / trailblaze 的客户端表现。
 *
 * 一句话：脚边草叶先向内收拢，随即沿一条抬起的草绿弧线窜出去，路上拖着碎叶与速度线，命中的地方炸开一整片
 * 草系撞击。色相家族：草绿（leaf / smallleaf / impact_grass，0x8CC63F 与 0x6FA83A），强调处近白。
 * 拍子：起（crouch 收叶）→ 窜（launch 弧线与草屑）→ 行（wake 拖尾）→ 击（hit）→ 提（boost）→ 落（land）。
 * 范围：launch 的弧线与 wake 的拖尾就是判定走过的同一条线，玩家看得出站在这条线上会被切到。
 * 运动：弧线由服务端给出的三元 path 抬起中点画出；身体沿地面掠过时，草屑沿同一条线向后抛。
 * 数：草屑数量绑定 `data.veil`（速度派生）、尺度绑定 `data.scale`（窜跃距离派生）、命中强弱绑定 `data.intensity`（威力派生）；
 *   草丛借势（`data.bloom`）为 0 时不额外爆草，起跳点有草木才多这一片。
 */
const TrailblazeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        crouch: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.15, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 18, shape: { kind: "ring", radius: 0.6 }, direction: "inward", speed: [0.04, 0.14],
                    spin: 40, lifetime: [6, 11], size: [0.2, 0.05],
                    color: 0x8CC63F, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.05, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "circle", radius: 0.5 }, direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0xBFD8A0, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        launch: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    shape: { kind: "polyline" }, rate: { data: "veil", fallback: 18 },
                    direction: "shape", speed: [0.03, 0.12], spread: 18,
                    lifetime: [5, 10], size: [0.22, 0.06], sizeMode: "index",
                    color: 0x8CC63F, alpha: [0.85, 0], light: "world", maxParticles: 120
                },
                {
                    name: "cover", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "bloom", fallback: 0 } }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.04, drag: 0.94,
                    spin: 60, lifetime: [8, 16], size: [0.24, 0.06], sizeMode: "index",
                    color: 0x6FA83A, alpha: [0.8, 0], light: "world", maxParticles: 80
                },
                {
                    name: "speed", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 18, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "velocity", speed: [0.1, 0.4],
                    lifetime: [5, 9], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xF2FFD8, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        },
        wake: {
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "trail", bind: "source", offset: [0, 0.2, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: { data: "veil", fallback: 18 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "away", speed: [0.02, 0.08], gravity: 0.03, drag: 0.95,
                    spin: 30, lifetime: [7, 13], size: [0.14, 0.03],
                    color: 0x8CC63F, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 28,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "veil", fallback: 18 } }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [7, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE8FFD0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "leaves", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "veil", fallback: 18 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.1, 0.3], spread: 24, gravity: 0.05, drag: 0.92,
                    spin: 70, lifetime: [9, 18], size: [0.26, 0.07], sizeMode: "index",
                    color: 0x6FA83A, alpha: [0.9, 0], light: "world", maxParticles: 120
                }
            ]
        },
        boost: {
            duration: 30,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "ring", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 16], size: [0.3, 0.6],
                    color: 0x8CC63F, alpha: [0.7, 0], light: "full", maxParticles: 20
                },
                {
                    name: "rush", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "stages", fallback: 1 }, interval: 3, repeats: 4 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.08, 0.3],
                    lifetime: [8, 14], size: [0.3, 0.05],
                    color: 0xE8FFD0, alpha: [0.8, 0], light: "full", maxParticles: 50
                },
                {
                    name: "glimmer", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "ring", radius: 0.6 }, direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.09, 0.01], sizeMode: "sin",
                    color: 0xD6F58A, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 20
                }
            ]
        },
        land: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "skid", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "veil", fallback: 18 } }, shape: { kind: "circle", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.03, drag: 0.9,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xB8C8A0, alpha: [0.45, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_trailblaze", 1, TrailblazeDefinition);
