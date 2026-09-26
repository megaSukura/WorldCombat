/**
 * 头锤 / headbutt 的客户端表现。
 *
 * 一句话：身体向后一缩、前额亮点聚起，接着沿瞄准方向短促地把头一伸，只有真撞上的接触点才炸开一小团钝白；
 * 被顶懵的人头顶晃出星子。没有长跑尘迹，也没有全身爆圈。
 * 色相家族：暖骨白（0xFFF2D8 / 0xD8C8A8）与土褐（0x8C7448）；饱和色只在冲击核心一点。
 * 拍子：起 windup（缩身聚亮）→ 顶 charge（短促前伸）→ impact（接触点小闪）／ miss（顶空扬尘）→ stagger（顶懵）。
 * 范围：charge 的亮点沿 `data.direction` 作一次前伸，impact 绑命中点，画出的就是撞中的位置。
 * 运动：前伸粒子沿瞄准方向排成短线段；命中的碎屑沿前伸方向退去，畏缩时星子从目标头顶向上飘。
 * 数：`data.hits`（威力派生）决定接触碎屑数，`data.intensity`（威力 / 70）抬高密度与亮度，
 * `data.scale`（头面判定 / 0.5）放大头部与尘点，`data.stride`（顶出距离 / 0.7）决定起步掀起的土块数，
 * `data.reach`（顶出距离）决定前伸线段的长度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HeadbuttDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.32, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0xC7A97B, alpha: [0.5, 0], light: "world", maxParticles: 36
                },
                {
                    name: "lower", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 9, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 10], size: [0.07, 0.02],
                    color: 0xFFF2D8, alpha: [0.55, 0], light: "full", bloom: 0.25, maxParticles: 26
                }
            ]
        },
        charge: {
            duration: 12,
            exit: { stop: 8, drain: 8 },
            emitters: [
                {
                    name: "push", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "stride", fallback: 2 } },
                    shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [7, 14], size: [0.1, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "brow", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 16, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: [4, 8], size: [0.1, 0.02],
                    color: 0xFFF6E0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "jab", bind: "source", height: 0.55, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 5, at: 0 },
                    shape: { kind: "line", length: { data: "reach", fallback: 0.7 } },
                    direction: "shape", speed: [0.02, 0.09],
                    lifetime: [3, 6], size: [0.12, 0.03],
                    color: 0xEADDC0, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        impact: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "crack", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "hits", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [5, 9], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 40
                },
                {
                    name: "grit", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "hits", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18],
                    gravity: 0.03, drag: 0.92,
                    lifetime: [7, 14], size: [0.06, 0.02],
                    color: 0xC7A97B, alpha: [0.7, 0], light: "world", maxParticles: 80
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
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.32, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.13],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xBFA377, alpha: [0.5, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_headbutt", 1, HeadbuttDefinition);
