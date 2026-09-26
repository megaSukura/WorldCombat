/**
 * 万有引力 / gravapple 的客户端表现。
 *
 * 一句话：施法者周围聚起草叶，一颗大苹果出现在目标正上方、沿重力竖井笔直落下，砸在目标身上炸开一蓬草叶与绿光；
 * 离地的目标在撞击处再被向下砸进地面。
 * 色相家族：草绿与暖黄绿（leaf／smallleaf／impact_grass／glowingsparkle_yellow 原色）＋中性尘（tinydust）。
 * 拍子：起（windup 聚叶）→ 击（release 落点、fall 下坠、impact 砸实）→ 收（slam 砸回地面 / miss 落地）。
 * 范围：`mark` / `mark_target` 用 `ring` 画出这记苹果的落点圈（半径＝`data.radius`），`line` 画出
 *   `data.height` 格高的下坠竖井；实体目标用 `mark_target` 把圈与竖井绑在目标身上，跟它的真实投影一起移动；
 *   点选落点用 `mark` 钉在地面投影上。顶棚低时 `height` 变短，竖井也随之缩短。
 * 运动：聚叶向内收，苹果沿竖井垂直加速下坠，命中向四周炸开、落叶带重力飘散，砸回地面时尘环贴地外扩。
 * 数：`data.crush`（实际降防级数）绑定撞击与砸地的草叶数，`data.height`（实际释放高度）绑定竖井长度与落点脉动，
 *   `data.speed`（下坠初速 / 0.42）绑定下坠尘叶的发射量，`data.intensity`（威力 / 78）放大整幕；
 *   `data.airborne` 让撞击在离地时更亮。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const GravappleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "gather_leaf", bind: "source", offset: [0, 1.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 22, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [8, 15], size: [0.1, 0.03],
                    color: 0x8FB55A, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "gather_glow", bind: "source", offset: [0, 1.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [7, 12], size: [0.08, 0.02],
                    color: 0xE8E0A0, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        release: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "release_pop", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], spread: 30,
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0xD8E8B0, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        mark: {
            duration: 0,
            exit: { stop: 0, drain: 16 },
            emitters: [
                {
                    name: "drop_ring", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0, repeats: 4, interval: 10 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 0.45 } },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [12, 18], size: [0.35, 0.1], sizeMode: "sin",
                    color: 0x9AB55A, alpha: [0.4, 0], light: "world", maxParticles: 4
                },
                {
                    name: "drop_shaft", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: { data: "speed", fallback: 14 }, shape: { kind: "line", length: { data: "height", fallback: 8 } },
                    direction: "down", speed: [0.08, 0.18],
                    gravity: 0.03, drag: 0.98,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xA8C878, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        mark_target: {
            duration: 0,
            exit: { stop: 0, drain: 16 },
            emitters: [
                {
                    name: "drop_ring", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0, repeats: 4, interval: 10 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 0.45 } },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [12, 18], size: [0.35, 0.1], sizeMode: "sin",
                    color: 0x9AB55A, alpha: [0.4, 0], light: "world", maxParticles: 4
                },
                {
                    name: "drop_shaft", bind: "target", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: { data: "speed", fallback: 14 }, shape: { kind: "line", length: { data: "height", fallback: 8 } },
                    direction: "down", speed: [0.08, 0.18],
                    gravity: 0.03, drag: 0.98,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xA8C878, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        fall: {
            duration: 0,
            exit: { stop: 0, drain: 14 },
            emitters: [
                {
                    name: "fall_glow", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "speed", fallback: 30 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.01, 0.05],
                    gravity: 0.03, drag: 0.99,
                    lifetime: [6, 11], size: [0.09, 0.02],
                    color: 0xE8E8B0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "fall_leaf", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: { data: "speed", fallback: 26 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.04, drag: 0.98,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x8FB55A, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "crush_core", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "crush", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.24], spread: 24,
                    lifetime: [7, 13], size: [0.42, 0.1], sizeMode: "index",
                    color: 0xE8F0C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "leaf_burst", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "crush", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    gravity: 0.05, drag: 0.92, spin: 8,
                    lifetime: [12, 22], size: [0.16, 0.03],
                    color: 0x7AA44A, alpha: [0.85, 0], light: "world", maxParticles: 40
                },
                {
                    name: "crush_dust", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x8A7A5A, alpha: [0.45, 0], light: "world", maxParticles: 50
                },
                {
                    name: "air_break", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf_white",
                    burst: { count: { data: "airborne", fallback: 0 }, at: 0, interval: 2, repeats: 4 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "down", speed: [0.12, 0.3],
                    gravity: 0.08, drag: 0.94,
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0xF0F8C8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        slam: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "slam_dust", bind: "target", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "crush", fallback: 1 }, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.06, 0.2],
                    gravity: 0.06, drag: 0.9,
                    lifetime: [9, 15], size: [0.34, 0.08], sizeMode: "index",
                    color: 0xC8D890, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "apple_land", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [9, 16], size: [0.09, 0.02],
                    color: 0x8FB55A, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "apple_dust", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x9A8A6A, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_gravapple", 1, GravappleDefinition);
