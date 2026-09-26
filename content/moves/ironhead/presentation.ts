/**
 * 铁头 / ironhead 的客户端表现。
 *
 * 一句话：钢铁光泽从前额泛起、短促一小步沉下去，铁头接触点炸开银白冲击与四溅火花；只有目标真的被顶离地面，
 * 才在它身上拖出一道向上的上升轨迹，随后震懵的人头顶晃星；撞墙则在真实方块面留下金属刮擦。
 * 色相家族：冷银（0xB8BEC8）与近白（0xF2F5F8）；橙黄只在火花一点上，饱和色只在冲击核心。
 * 拍子：起 harden（钢铁化）→ 击 stomp（短步沉头）→ impact（命中接触）→ launch（真实掀飞）→ stagger（震懵）。
 * 范围：stomp 的前导短线来自上步距离，impact 与 launch 绑命中点／目标，画出的就是砸中的位置和真实的飞行路径。
 * 运动：火花沿接触点迸射并带重力下落，上升层只在收到真实位移回执时随目标升高；免推的目标没有 launch。
 * 数：`data.hits`（威力派生）决定冲击与火花数，`data.intensity`（威力 / 85）抬高密度与亮度，
 * `data.scale`（铁面判定 / 0.55）放大头部与尘环，`data.stride`（上步距离 / 0.7）决定起步压出的土块数，
 * `data.reach`（上步距离）决定前导短线的长度，`data.sparks`（实际推开格数 + 是否顶起）决定上升层的量。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const IronheadDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        harden: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "glint", bind: "source", offset: [0, 0.1, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    rate: 14, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xF2F5F8, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 48
                },
                {
                    name: "sheen", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0xB8BEC8, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        stomp: {
            duration: 40,
            exit: { stop: 26, drain: 14 },
            emitters: [
                {
                    name: "press", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "stride", fallback: 3 } },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [8, 15], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x8A8F97, alpha: [0.55, 0], light: "world", maxParticles: 70
                },
                {
                    name: "brow", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 14, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [4, 9], size: [0.1, 0.02],
                    color: 0xF2F5F8, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "lead", bind: "source", height: 0.6, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "line", length: { data: "reach", fallback: 0.7 } },
                    direction: "shape", speed: [0.02, 0.09],
                    lifetime: [3, 6], size: [0.12, 0.03],
                    color: 0xDCE2E8, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 13, drain: 18 },
            emitters: [
                {
                    name: "clang", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "hits", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [6, 11], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xF2F5F8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "sparks", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "hits", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.12, 0.4], spread: 26,
                    gravity: 0.06, drag: 0.9,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFFE9A8, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 130
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [10, 17], size: [0.4, 0.95], sizeMode: "sin",
                    color: 0xB8BEC8, alpha: [0.55, 0], light: "full"
                }
            ]
        },
        launch: {
            duration: 30,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "rise", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "sparks", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.16, 0.42], spread: 18,
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0xB8BEC8, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "spray", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "sparks", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.34], spread: 30,
                    gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xFFE9A8, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "rung", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/scaling",
                    burst: { count: 2, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [10, 16], size: [0.14, 0.03],
                    color: 0xF2F5F8, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        stagger: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "ringing", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [12, 18], size: [0.15, 0.04],
                    color: 0xF2F5F8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 24
                }
            ]
        },
        crash: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scrape", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [5, 10], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xF2F5F8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "dust", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [7, 14], size: [0.07, 0.02],
                    color: 0x8A8F97, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "thud", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.15],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0x8A8F97, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ironhead", 1, IronheadDefinition);
