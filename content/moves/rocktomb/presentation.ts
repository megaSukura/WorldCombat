/**
 * 岩石封锁 / rocktomb 的客户端表现。
 *
 * 一句话：脚边拎起一块重石头、沿低弧线砸向方向点或选中目标；砸中落地目标（或真正落地）后，脚下一圈石柱拔地而起，
 * 每根成功放下的石柱各起一缕尘，离地或砸墙时石头只炸成石屑。
 * 色相家族：岩石的暖灰褐（earth／tinydust／large_rock／impact_rock 原色）＋一处近白高光（glowingsparkle）标示围栏合拢。
 * 拍子：起（windup 拎石）→ 击（throw 飞行、hit 砸实）→ 收（cage 围栏合拢 / pillar 逐根起尘 / shatter 石屑 / miss 落地）。
 * 范围：`cage` 用 ring 形状画出与判定同一半径的地面圈（`data.scale`＝封锁半径 / 1.3）；石柱不再整圈一次冒，
 *   改由服务端对原生真正放下的每一根石柱各发一次 `pillar`（bind point，点在真实格子上），缺口处不会亮。
 * 运动：拎石是石屑向内收，飞行是贴石屑的短尾迹，围栏是贴地环向外扩后再逐根起尘；离地/砸墙则整块石头向外炸开。
 * 数：`data.notes`（投石威力换算）绑定命中石屑数，`data.pillars`（实际放下的石柱根数，仅作留档）与逐根 `pillar` 的
 *   实际发点数绑定围栏量，`data.stages`（实际降速级数）绑定合拢高光的强度，`data.intensity`（威力 / 55）放大整幕。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const RocktombDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "gather_dust", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 20, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0x9A8A72, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "gather_rock", bind: "source", offset: [0, 0.9, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.14, 0.05],
                    color: 0xBFB0A0, alpha: [0.7, 0], light: "full", maxParticles: 18
                }
            ]
        },
        throw: {
            duration: 0,
            exit: { stop: 0, drain: 18 },
            emitters: [
                {
                    name: "rock_trail", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.22 },
                    rate: 40, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.1],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x9A8A72, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "rock_burst", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "notes", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [7, 13], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xF0E6D8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "rock_shard", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.08, drag: 0.9,
                    lifetime: [10, 18], size: [0.11, 0.03],
                    color: 0x8A7A62, alpha: [0.55, 0], light: "world", maxParticles: 50
                }
            ]
        },
        cage: {
            duration: 34,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "ground_ring", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 0, repeats: 2, interval: 8 },
                    shape: { kind: "ring", radius: 1.3 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [14, 22], size: [0.6, 0.2], sizeMode: "linear",
                    color: 0x7A6A56, alpha: [0.45, 0], light: "world", maxParticles: 4
                },
                {
                    name: "lock_glow", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "stages", fallback: 1 }, at: 6, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: 1.25 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xF4EEDC, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                }
            ]
        },
        pillar: {
            duration: 30,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "pillar_dust", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.08, 0.22],
                    gravity: 0.08, drag: 0.92,
                    lifetime: [10, 18], size: [0.15, 0.04],
                    color: 0x8A7A62, alpha: [0.8, 0], light: "world", maxParticles: 20
                },
                {
                    name: "pillar_core", bind: "point", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.06, 0.14],
                    gravity: 0.09, drag: 0.9, spin: 6,
                    lifetime: [8, 14], size: [0.18, 0.1],
                    color: 0xB8A894, alpha: [0.75, 0], light: "world", maxParticles: 6
                }
            ]
        },
        shatter: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shatter_core", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "notes", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.24], spread: 24,
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xE8DCCC, alpha: [1, 0], light: "full", maxParticles: 50
                },
                {
                    name: "shatter_dust", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.1],
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 20], size: [0.35, 0.1],
                    color: 0x9A8A72, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "land_dust", bind: "point", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "notes", fallback: 10 }, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.08, drag: 0.9,
                    lifetime: [9, 16], size: [0.1, 0.03],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rocktomb", 1, RocktombDefinition);
