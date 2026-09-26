/**
 * 泰山压顶 / bodyslam 的客户端表现。
 *
 * 一句话：重身先蹲下压出尘圈，腾空时拖出向上的速度线，砸下的一刻地面炸开一圈冲击波并掀起土块，
 * 被压到的目标各自炸出一团钝击尘。
 * 色相家族：土棕（earth / tinydust）为主、灰烟为余韵，唯一亮色是钝击命中的暖白 impact_normal。
 * 拍子：标（mark 计划落点 → 受阻时移到实际脚下）→ 起（windup 蹲身）→ 行（leap 腾空）→ 击（crash 落地）→ 收（dust 余尘与 impact）。
 * mark 的贴地环按 `data.scale`（落点半径 / 2.0）铺满，画出的就是当前会被压到的那块地。
 * 范围：crash 的贴地冲击环按 `data.scale`（落点半径 / 2.0）铺满，画出的就是会被压到的那块地。
 * 运动：debris 沿球面外抛带重力，shock 贴地向外扩，dust 缓慢上浮留下余韵。
 * 数：`data.bursts`（命中人数换算的碎块数）决定落地碎块与尘量，`data.intensity`（本击威力 / 80）抬高命中亮度，
 * `data.hop` 只用于腾空幕的纵向铺开。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BodyslamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: 8,
            exit: { stop: 0, drain: 6 },
            emitters: [
                {
                    name: "plan_ring", bind: "point", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 12, shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.3, 0.12], sizeMode: "sin",
                    color: 0xE0C88A, alpha: [0.35, 0], light: "world", maxParticles: 30
                },
                {
                    name: "plan_dust", bind: "point", offset: [0, 0.03, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.4, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.01, 0.03],
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0xC7A97B, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "coil_dust", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xC7A97B, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "brace", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [7, 14], size: [0.1, 0.03], sizeMode: "sin",
                    color: 0xD8C19A, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        leap: {
            duration: 18,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "launch_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [9, 18], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 120
                },
                {
                    name: "rise_lines", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "box", size: [0.34, 0.5, 0.34] },
                    direction: "up", speed: [0.04, 0.16],
                    lifetime: [4, 9], size: [0.18, 0.05],
                    color: 0xEADDC0, alpha: [0.5, 0], light: "full", maxParticles: 150
                }
            ]
        },
        crash: {
            duration: 32,
            exit: { stop: 15, drain: 22 },
            emitters: [
                {
                    name: "shock", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.5, 1.5],
                    color: 0xA98A5A, alpha: [0.55, 0], light: "world", maxParticles: 24
                },
                {
                    name: "debris", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "bursts", fallback: 24 } },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.55, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.28],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [10, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.7, 0], light: "world", maxParticles: 200
                },
                {
                    name: "flash", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 12], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFE9B8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 60
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.28, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "bursts", fallback: 20 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [16, 28], size: [0.42, 0.12],
                    color: 0xB99A66, alpha: [0.32, 0], light: "world", maxParticles: 140
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xFFE0A0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 50
                },
                {
                    name: "motes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 26 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.06, 0.24],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [9, 18], size: [0.06, 0.02],
                    color: 0xC7A97B, alpha: [0.7, 0], light: "world", maxParticles: 120
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bodyslam", 1, BodyslamDefinition);
