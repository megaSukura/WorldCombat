/**
 * 头锤 / headbutt 的客户端表现。
 *
 * 一句话：低头沿一条直线扑出去，脚边一路扬尘，整颗头撞实的一刻在接触点炸开一团钝白冲击与碎屑；
 * 被顶懵的人头顶晃出星子。
 * 色相家族：暖骨白（0xFFF2D8 / 0xD8C8A8）与土褐（0x8C7448）；饱和色只在冲击核心一点。
 * 拍子：起 windup（低头刨地）→ 击 charge（直线扑）→ impact（命中峰值）／ miss（扑空刹停）→ stagger（顶懵）。
 * 范围：charge 的尘迹沿施法者实际走出的直线铺开，impact 绑命中点，画出的就是撞中的位置。
 * 运动：速度线沿冲撞方向掠过，命中后碎屑沿冲撞方向退去，畏缩时星子从目标头顶向上飘。
 * 数：`data.hits`（威力派生）决定命中碎屑数，`data.intensity`（威力 / 70）抬高密度与亮度，
 * `data.scale`（头面判定 / 0.5）放大头部与尘环，`data.stride`（扑出距离 / 0.7）决定起跑掀起的土块数。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HeadbuttDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xC7A97B, alpha: [0.5, 0], light: "world", maxParticles: 48
                },
                {
                    name: "lower", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.07, 0.02],
                    color: 0xFFF2D8, alpha: [0.55, 0], light: "full", bloom: 0.25, maxParticles: 30
                }
            ]
        },
        charge: {
            duration: 50,
            exit: { stop: 36, drain: 14 },
            emitters: [
                {
                    name: "start_clods", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "stride", fallback: 4 } },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [8, 16], size: [0.11, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 110
                },
                {
                    name: "dust_trail", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, trail: { minDistance: 0.3 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0xBFA377, alpha: [0.5, 0], light: "world", maxParticles: 150
                },
                {
                    name: "headspeed", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "box", size: [0.28, 0.3, 0.28] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [3, 7], size: [0.16, 0.04],
                    color: 0xEADDC0, alpha: [0.45, 0], light: "full", maxParticles: 130
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "crack", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "hits", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.07, 0.26],
                    lifetime: [5, 10], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "grit", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "hits", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.22],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.07, 0.02],
                    color: 0xC7A97B, alpha: [0.7, 0], light: "world", maxParticles: 120
                },
                {
                    name: "thud", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [9, 16], size: [0.32, 0.07],
                    color: 0xEADDC0, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        stagger: {
            duration: 24,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "stars", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [11, 17], size: [0.14, 0.04],
                    color: 0xFFF2D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.38, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.15],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xBFA377, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_headbutt", 1, HeadbuttDefinition);
