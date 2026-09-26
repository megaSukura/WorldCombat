/**
 * 流星光束 / meteorbeam 的客户端表现。
 *
 * 一句话：碎星从高空一串串落到施法者身上、在脚边溅开一圈，随后一颗拖着火星的陨石沿抛物线飞出去，
 *         落地炸开一圈星尘与碎岩，再溅起一记短促的碎石与尘。
 * 色相家族：暖星金（0xFFD873 / 0xFFF3D0）＋岩褐（0x9A8A72 / 0x6E6352）；星金只出现在聚星与爆点的核心。
 * 拍子：起 gather（落星）→ boost（特攻提升的一记竖光）→ flight（陨石飞行）→ burst（落点炸开）→ debris（短促碎石余尘）。
 * 范围：burst 的半径绑定 `data.blast`（落点半径），debris 的碎石铺在同一半径内——站进这一圈就会被溅射到。
 * 运动：gather 的星点由上往下落；flight 的陨石沿抛物线飞（服务端 ballistic）；burst 向外炸、debris 贴地短溅后散去。
 * 数：`data.starlight`（特攻与等级换算）决定聚星与爆点密度，`data.intensity`（威力/120）决定亮度，
 *     `data.scale`（落点半径/1.9）决定整体尺度，`data.hits`（命中数）决定碎石余尘的强度。
 */
const MeteorBeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 28 },
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "gather_fall", bind: "source", offset: [0, 3.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: { data: "starlight", fallback: 12 }, shape: { kind: "cylinder", radius: 0.55, length: 3.0 },
                    direction: "down", speed: [0.06, 0.22],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFF3D0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "gather_core", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 13], size: [0.18, 0.03], sizeMode: "sin",
                    color: 0x9A8A72, alpha: [0.8, 0], light: "world", maxParticles: 50
                },
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 3, interval: 8, repeats: 3, at: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.4, 0.1],
                    color: 0xC8B490, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        boost: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "boost_column", bind: "source", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    burst: { count: 1 }, shape: { kind: "line", length: 2.6 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [8, 14], size: [1.9, 1.2], sizeMode: "sin",
                    color: 0xFFD873, alpha: [0.55, 0], light: "full", bloom: 0.5, maxParticles: 6
                },
                {
                    name: "boost_spark", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "starlight", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [7, 14], size: [0.09, 0.02],
                    color: 0xFFF3D0, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 80
                }
            ]
        },
        flight: {
            duration: 160,
            exit: { stop: 140, drain: 18 },
            emitters: [
                {
                    name: "flight_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/moves/meteor",
                    rate: 30, shape: { kind: "sphere", radius: 0.2 },
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 12], size: [0.36, 0.16],
                    color: 0xFFF3D0, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "flight_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    trail: { minDistance: 0.35 }, rate: 40,
                    direction: "away", speed: [0.01, 0.05], spread: 22,
                    lifetime: [8, 16], size: [0.14, 0.02],
                    color: 0xD8894A, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "flight_grit", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.45 }, rate: 24,
                    direction: "away", speed: [0.01, 0.04], gravity: 0.03,
                    lifetime: [10, 20], size: [0.07, 0.02],
                    color: 0x8A7A64, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "burst_flash", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "starlight", fallback: 18 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.4 } },
                    direction: "outward", speed: [0.08, 0.28], spread: 22,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF3D0, alpha: [1, 0], light: "full", bloom: 0.45
                },
                {
                    name: "burst_ring", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "hits", fallback: 2 }, interval: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [12, 20], size: [0.5, 1.6],
                    color: 0xC8B490, alpha: [0.6, 0], light: "full", maxParticles: 20
                },
                {
                    name: "burst_rocks", bind: "point", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "starlight", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.4 } },
                    direction: "outward", speed: [0.08, 0.26], gravity: 0.1, drag: 0.88,
                    lifetime: [14, 28], size: [0.26, 0.1],
                    color: 0x9A8A72, alpha: [0.85, 0], light: "world", maxParticles: 70
                }
            ]
        },
        debris: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "debris_dust", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "debris", fallback: 8 } },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.9,
                    lifetime: [10, 20], size: [0.2, 0.32],
                    color: 0x6E6352, alpha: [0.4, 0], light: "world", maxParticles: 60
                },
                {
                    name: "debris_grit", bind: "point", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "stones", fallback: 5 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.4 } },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.12, drag: 0.88,
                    lifetime: [8, 16], size: [0.18, 0.06],
                    color: 0x9A8A72, alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "miss_puff", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0x7A6E5C, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_meteorbeam", 1, MeteorBeamDefinition);
