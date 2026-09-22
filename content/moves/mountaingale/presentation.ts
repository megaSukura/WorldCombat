/**
 * 冰山风 / mountaingale 的客户端表现。
 *
 * 一句话：身前的碎冰拔地汇聚、凝成一块巨大的冰块，抡起来沿一条低弧线飞出去、拖着冰雪尾迹，
 * 落在目标处炸开成一整圈碎冰与霜雾，中心立起一簇冰锥；被砸懵的人头顶晃星。
 * 色相家族：冰青（0x9FD8E8）与近白（0xEAFBFF）为主，深青（0x5E9FB8）只在巨冰与冰锥上。
 * 拍子：起 hoist（聚冰）→ 掷 throw（弧线飞行）→ 碎 shatter（落点爆开）＋ hit（正中）／ splash（溅射）→ stagger（砸懵）／ miss。
 * 范围：shatter 的地面圈按 `data.radius`（碎裂半径）铺开，画出的就是会被碎冰扫到的那圈。
 * 运动：巨冰绑 projectile 沿服务端下发的弧线飞行并拖冰尘，落地后碎冰向四周带重力外抛、贴地铺霜。
 * 数：`data.hits`（主伤派生）决定碎冰量，`data.intensity`（主伤 / 100）抬高密度与亮度，
 * `data.radius`（碎裂半径）与 `data.scale`（碎裂半径 / 2.2）决定地面圈的尺度，
 * `data.rise`（主伤 / 40）决定聚冰阶段立起的冰柱高度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const MountaingaleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        hoist: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 34, shape: { kind: "ring", radius: 1.1 },
                    direction: "inward", speed: [0.04, 0.18], spin: 10,
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0xCFEEF6, alpha: [0.8, 0], light: "world", maxParticles: 140
                },
                {
                    name: "snowlift", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 22, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.02, 0.1], gravity: -0.012, drag: 0.94,
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0xBFE0EA, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "core", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: { data: "rise", fallback: 3 }, interval: 3, repeats: 5 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.12, 0.03],
                    color: 0xEAFBFF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        throw: {
            duration: 200,
            exit: { stop: 18, drain: 16 },
            emitters: [
                {
                    name: "shell", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 46, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.12], trail: { minDistance: 0.35 },
                    lifetime: [8, 16], size: [0.18, 0.03],
                    color: 0xCFEEF6, alpha: [0.85, 0], light: "world", maxParticles: 180
                },
                {
                    name: "wake", bind: "projectile", offset: [0, -0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 30, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.01, 0.08],
                    gravity: 0.03, drag: 0.94,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xB8DEEA, alpha: [0.45, 0], light: "world", maxParticles: 120
                }
            ]
        },
        shatter: {
            duration: 32,
            exit: { stop: 13, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "hits", fallback: 22 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.1, 0.4], spread: 20,
                    lifetime: [6, 12], size: [0.44, 0.06], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 110
                },
                {
                    name: "chunks", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "hits", fallback: 22 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.14, 0.5], spin: 14,
                    gravity: 0.07, drag: 0.92,
                    lifetime: [14, 26], size: [0.26, 0.05],
                    color: 0x9FD8E8, alpha: [0.9, 0], light: "world", maxParticles: 140
                },
                {
                    name: "frost_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "hits", fallback: 22 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.08, 0.3], spread: 12,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 22], size: [0.1, 0.02],
                    color: 0xCFEEF6, alpha: [0.6, 0], light: "world", maxParticles: 160
                },
                {
                    name: "quake", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [12, 20], size: [0.6, 1.4], sizeMode: "sin",
                    color: 0x8FC8DA, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "mist", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 20, at: 1 },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "up", speed: [0.01, 0.07],
                    lifetime: [16, 28], size: [0.26, 0.44],
                    color: 0xBFE0EA, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 11, drain: 15 },
            emitters: [
                {
                    name: "smash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "hits", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 80
                },
                {
                    name: "glaze", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "hits", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.28],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xCFEEF6, alpha: [0.85, 0], light: "world", maxParticles: 90
                }
            ]
        },
        splash: {
            duration: 20,
            exit: { stop: 9, drain: 13 },
            emitters: [
                {
                    name: "clip", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.28], spread: 26,
                    gravity: 0.05, drag: 0.93,
                    lifetime: [9, 16], size: [0.16, 0.03],
                    color: 0x9FD8E8, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        stagger: {
            duration: 28,
            exit: { stop: 13, drain: 20 },
            emitters: [
                {
                    name: "daze", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [12, 18], size: [0.15, 0.04],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 15 },
            emitters: [
                {
                    name: "scuff", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 16], size: [0.07, 0.02],
                    color: 0xBFE0EA, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mountaingale", 1, MountaingaleDefinition);
