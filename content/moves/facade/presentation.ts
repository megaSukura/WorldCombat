/**
 * 硬撑 / facade 的客户端表现。
 *
 * 一句话：带着伤的身体压低压出一道尘，猛地贴地冲出去，撞实的一刻炸开一大团尘，并把身上的异常一同甩出来。
 * 色相家族：土黄中性色为底（earth / tinydust / smoke），强调只用 impact_normal 的原色亮帧；
 * 异常的色相只出现在一小撮“甩出的痛”上（`data.tint`，由服务端按中毒／灼伤／麻痹／冰冻给出）。
 * 拍子：起（brace 0–7t，压低蓄势）→ 击（drive 与 impact）→ 收（shove 余韵、whiff 落空）。
 * 范围：brace/drive 的尘环贴施法者脚下、impact/shove 的爆与环绑命中点——画出的就是判定命中的位置。
 * 运动：速度线随施法者沿冲撞方向掠过，命中后尘土沿顶开方向退去，异常粒子从命中处向上散开。
 * 数：`data.essence`／`data.essenceRate` 画出身上异常的种类与量，`data.intensity`（本次威力 / 70）抬高爆尘密度与亮度，
 * `data.scale`（判定半径 / 0.55）放大 drive 的尘环。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const FacadeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 10,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "crouch_dust", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 15, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [5, 11], size: [0.05, 0.02],
                    color: 0xB9A57A, alpha: [0.55, 0], light: "world", maxParticles: 44
                },
                {
                    name: "coil", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [6, 12], size: [0.09, 0.04], sizeMode: "sin",
                    color: 0xD8C48C, alpha: [0.4, 0], light: "full", maxParticles: 18
                },
                {
                    name: "ache", bind: "source", offset: [0, 0.75, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 0, burst: { count: { data: "essence", fallback: 0 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [8, 16], size: [0.08, 0.02], sizeMode: "sin",
                    color: { data: "tint", fallback: 0xE8D8B0 }, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        drive: {
            duration: 30,
            exit: { stop: 22, drain: 12 },
            emitters: [
                {
                    name: "dash_lines", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 36, shape: { kind: "box", size: [0.3, 0.25, 0.3] },
                    direction: "shape", speed: [0.02, 0.08], trail: { minDistance: 0.25 },
                    lifetime: [5, 9], size: [0.18, 0.06],
                    color: 0xF2E3B0, alpha: [0.7, 0], light: "full", maxParticles: 220
                },
                {
                    name: "kicked_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 24, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 16], size: [0.09, 0.02], sizeMode: "index",
                    color: 0x9C8455, alpha: [0.5, 0], light: "world", maxParticles: 170
                },
                {
                    name: "ache_trail", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "essenceRate", fallback: 0 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.3 },
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: { data: "tint", fallback: 0xE8D8B0 }, alpha: [0.6, 0], light: "full", maxParticles: 90
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "hit_flash", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "flash", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [7, 12], size: [0.36, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "burst_dust", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "dust", fallback: 30 } },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [16, 28], size: [0.3, 0.08],
                    color: 0x8C7448, alpha: [0.35, 0], light: "world", maxParticles: 130
                },
                {
                    name: "grit", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "grit", fallback: 46 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.3],
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xD8C48C, alpha: [0.7, 0], gravity: 0.03, drag: 0.9, light: "world", maxParticles: 150
                },
                {
                    name: "thrown_ache", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: { data: "essence", fallback: 0 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.18],
                    lifetime: [10, 20], size: [0.1, 0.03], sizeMode: "sin",
                    color: { data: "tint", fallback: 0xE8D8B0 }, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        shove: {
            duration: 22,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "push_ring", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.12],
                    lifetime: [10, 16], size: [0.32, 0.12],
                    color: 0xA89162, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "skid", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 20, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.08, 0.02], sizeMode: "index",
                    color: 0x9C8455, alpha: [0.45, 0], light: "world", maxParticles: 80
                }
            ]
        },
        whiff: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "skid_out", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0x9C8455, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_facade", 1, FacadeDefinition);
