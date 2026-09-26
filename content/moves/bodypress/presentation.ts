/**
 * 扑击 / bodypress 的客户端表现。
 *
 * 一句话：压低重心、架住肩甲站定，脚下掀起一圈土；随后整副身板一步步推出去，撞上对手就顶住不放，
 * 一路把对方碾着推走，在地面犁出一道土痕。
 * 色相家族：格斗暖橙与土棕（impact_fighting / earth / tinydust）为主，灰烟为余韵，没有第二种色相。
 * 拍子：起（brace 架式）→ 行（drive 推进）→ 击（impact 顶实）→ 收（grind 碾推 / compress 顶不动压实 / settle 站定 / miss 推空）。
 * 范围：impact 绑命中点，grind 绑被顶住的目标、随它一起被推走，画出的就是被顶开的那段路；compress 绑顶不动的目标，短促收束。
 * 运动：drive 的尘土沿历史拖尾，impact 是贴地外扩的钝击环，grind 是目标脚边持续被犁开的土，compress 是向内收的短压力环。
 * 数：`data.clods`（顶推距离 × 8，取整）决定架上、站定与压实时掀起的土块数，`data.scale` 放大范围，
 * `data.intensity`（本击威力 / 100）抬高撞击的密度与亮度，`data.ratio` 与 `data.travel` 只是实际顶推进度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BodypressDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 12,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "plant", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 14], size: [0.06, 0.02],
                    color: 0xC7A97B, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "guard", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 16], size: [0.18, 0.04], sizeMode: "sin",
                    color: 0xE9B071, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        drive: {
            duration: 60,
            exit: { stop: 44, drain: 16 },
            emitters: [
                {
                    name: "kick", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "clods", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [9, 17], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.65, 0], light: "world", maxParticles: 140
                },
                {
                    name: "heave_trail", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 26, trail: { minDistance: 0.34 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xBFA377, alpha: [0.5, 0], light: "world", maxParticles: 150
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFD9A0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "ground", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.5, 1.4],
                    color: 0xA98A5A, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [16, 26], size: [0.4, 0.12],
                    color: 0xB99A66, alpha: [0.3, 0], light: "world", maxParticles: 120
                }
            ]
        },
        grind: {
            duration: 20,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "plough", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 44, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [9, 16], size: [0.11, 0.03], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.7, 0], light: "world", maxParticles: 200
                },
                {
                    name: "pressure", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 22, shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [12, 22], size: [0.34, 0.1],
                    color: 0xB99A66, alpha: [0.26, 0], light: "world", maxParticles: 90
                }
            ]
        },
        compress: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "brace_ring", bind: "target", offset: [0, 0.18, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 2, at: 0, interval: 2 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [7, 12], size: [0.34, 0.9],
                    color: 0xA98A5A, alpha: [0.45, 0], light: "world", maxParticles: 16
                },
                {
                    name: "hold_dust", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "clods", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.06], gravity: 0.04, drag: 0.94,
                    lifetime: [7, 13], size: [0.07, 0.02],
                    color: 0xBFA377, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        settle: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "settle_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "clods", fallback: 8 } },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xC7A97B, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "push_nothing", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xBFA377, alpha: [0.45, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bodypress", 1, BodypressDefinition);
