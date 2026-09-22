/**
 * 摔打 / slam 的客户端表现。
 *
 * 一句话：长肢高举过头的起手 → 地面上亮起一个圆、标出砸点（它就是判定范围，缩到落下的那一刻）→
 * 重砸落下，圆里炸起一柱钝白尘土、四周泥土向外扑，命中处碎石外抛；圆里没人就只留一圈尘。
 * 色相家族：暖土棕（earth／tinydust）为主，钝白（impact_normal）只出现在重砸核心；单一色相，无饱和色。
 * 拍子：起 raise → 标 mark（地面圆，等待落下）→ 砸 impact（核心爆发）→ 击 hit（碎石）/ 空 whiff。
 * 范围：mark 的 ring 半径绑 `data.radius`（crater），画出的那个圆就是会被砸到的区域；impact 用同一半径复核。
 * 运动：起手尘土向上收，落下时核心向下砸开、土块受重力向外抛，地面圆静止等待。
 * 数：扬尘数量绑 `data.dust`（体重派生），强度绑 `data.intensity`（本击威力 / 90），砸落等待绑 `data.fall`。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const SlamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "ring", radius: 0.48, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.55, 0], light: "world", maxParticles: 70
                },
                {
                    name: "taut", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 16, shape: { kind: "box", size: [0.3, 0.8, 0.3] },
                    direction: "up", speed: [0.05, 0.18],
                    lifetime: [3, 7], size: [0.14, 0.03],
                    color: 0xEADDC0, alpha: [0.4, 0], light: "full", maxParticles: 60
                }
            ]
        },
        mark: {
            duration: 0,
            exit: { stop: 2, drain: 8 },
            emitters: [
                {
                    name: "target_ring", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    rate: 26, shape: { kind: "ring", radius: { data: "radius", fallback: 1.0 } },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xF0E6CE, alpha: [0.5, 0], light: "full", maxParticles: 90
                },
                {
                    name: "target_fill", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, shape: { kind: "circle", radius: { data: "radius", fallback: 1.0 }, thickness: 0.2 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xC7A97B, alpha: [0.22, 0], light: "world", maxParticles: 120
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "dust", fallback: 20 }, at: 1 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.0 }, length: 1.6 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26,
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "soil", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 20 } },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 1.0 } },
                    direction: "outward", speed: [0.08, 0.32], spread: 20,
                    gravity: 0.07, drag: 0.92,
                    lifetime: [10, 20], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "shock_ring", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 20 }, interval: 2, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.0 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.1, 0.34], spread: 8,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xC7A97B, alpha: [0.6, 0], light: "world", maxParticles: 130
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "crush", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "dust", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.28], spread: 24,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xE8DCC0, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "grit", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.06, drag: 0.92,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8C7448, alpha: [0.65, 0], light: "world", maxParticles: 90
                }
            ]
        },
        whiff: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "empty", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.0 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xC7A97B, alpha: [0.45, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_slam", 1, SlamDefinition);
