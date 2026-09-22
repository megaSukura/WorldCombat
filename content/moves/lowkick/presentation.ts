/**
 * 踢倒 / lowkick 的客户端表现。
 *
 * 一句话：施法者压低重心、脚边蹬起一小撮尘 → 身体贴地俯冲、身后拖出一条速度线 → 一脚扫在对手的小腿上，
 * 爆开一记钝击与一只脚影 → 被扫中的人腿边尘土一沉、整个人晃了一下。
 * 色相家族：暖土褐（earth / tinydust）与暖橙钝击（impact_fighting / foot）为主，速度线为浅米色，无饱和色。
 * 拍子：起（windup 压腿）→ 行（dash 俯冲）→ 击（impact 扫中）→ 收（trip 失衡、miss 踢空）。
 * 范围：impact 绑命中目标、画出的就是扫中的位置；这是一记贴身单体招，没有铺开的地面区域。
 * 运动：俯冲时速度线沿历史拖尾、脚尘向外炸；命中是短促的外爆加一只下压的脚影；失衡是腿边一沉。
 * 数：dash 的起步尘量绑 `data.stride`（突进距离派生），impact 的尘量绑 `data.intensity`（本击威力 / 70），脚影数绑 `data.coils`（掉速等级派生）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const LowKickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 8,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "plant", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 14, shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0x8C7448, alpha: [0.55, 0], light: "world", maxParticles: 40
                },
                {
                    name: "coil", bind: "source", offset: [0, 0.28, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [6, 11], size: [0.05, 0.01],
                    color: 0xBFA377, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        dash: {
            duration: 30,
            exit: { stop: 20, drain: 12 },
            emitters: [
                {
                    name: "launch", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "stride", fallback: 4 } },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.18],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.1, 0.02], sizeMode: "index",
                    color: 0x8C7448, alpha: [0.6, 0], light: "world", maxParticles: 100
                },
                {
                    name: "rush", bind: "source", offset: [0, 0.3, 0], height: 0.28,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 26, trail: { minDistance: 0.3 },
                    shape: { kind: "box", size: [0.24, 0.3, 0.24] },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [3, 6], size: [0.16, 0.03],
                    color: 0xEADDC0, alpha: [0.5, 0], light: "full", maxParticles: 120
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 24, trail: { minDistance: 0.28 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.07, 0.01],
                    color: 0xBFA377, alpha: [0.45, 0], light: "world", maxParticles: 120
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "sweep_core", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [5, 10], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFE0B8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "foot_marks", bind: "target", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/foot",
                    burst: { count: { data: "coils", fallback: 8 }, at: 1 },
                    shape: { kind: "arc", radius: 0.4, arcDegrees: 150, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 15], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xE8C08A, alpha: [0.85, 0], light: "world", maxParticles: 40
                },
                {
                    name: "scuff", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.04, 0.2],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xA98A5E, alpha: [0.55, 0], light: "world", maxParticles: 90
                }
            ]
        },
        trip: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "stagger", bind: "target", offset: [0, 0.06, 0], height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.28, 0.06],
                    color: 0x8C7448, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.38, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xBFA377, alpha: [0.45, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lowkick", 1, LowKickDefinition);
