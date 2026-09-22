/**
 * 超音波 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者鼓起身子，一圈靛蓝的音浪贴着地面向外推开，波面上细响成片；被扫到的目标头顶
 * 立刻转起迷路的飞鸟。
 *
 * 色相家族：青蓝（0x6AD8FF）为主体，靛蓝（0x2F6FA8）压核心，近白只做高光。
 * 层次：蓄声（起手）、波面（一圈随机制半径扩张的环，半径绑 data.scale）、细响（波面外散的音点）、
 *       命中（目标身上的音爆）、迷乱飞鸟（持续）、反噬（打中别人后自伤的一顿）。
 * 起击收：windup（蓄声）→ wave（贴地推出去）→ mark（扫到人）→ linger（还在发懵）。
 * 数：波面细响数与波面亮度按 data.motes 派生，越强的特攻越密；半径由服务端 data.scale 驱动（真实半径 / 6）。
 */
const SupersonicDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            emitters: [
                {
                    name: "build_swirl", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 20, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [12, 20], size: [0.3, 0.12], sizeMode: "sin",
                    color: 0x6AD8FF, alpha: [0.5, 0], alphaMode: "sin", light: "full", maxParticles: 50
                },
                {
                    name: "build_note", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 8, shape: { kind: "circle", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.2, 0.08], sizeMode: "sin",
                    color: 0xB6EEFF, alpha: [0.6, 0], alphaMode: "sin", light: "full", maxParticles: 24
                }
            ]
        },
        wave: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "wave_ring", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: { data: "motes", fallback: 24 }, shape: { kind: "ring", radius: 6 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [14, 26], size: [0.62, 0.34], sizeMode: "sin",
                    color: 0x6AD8FF, alpha: [0.55, 0], alphaMode: "sin", light: "full", maxParticles: 180
                },
                {
                    name: "wave_note", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: { data: "motes", fallback: 18 }, shape: { kind: "ring", radius: 6 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 20], size: [0.16, 0.05],
                    color: 0xB6EEFF, alpha: [0.6, 0], light: "full", maxParticles: 160
                },
                {
                    name: "wave_dust", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "ring", radius: 6 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.07, 0.01],
                    color: 0x2F6FA8, alpha: [0.35, 0], light: "world", maxParticles: 200
                }
            ]
        },
        mark: {
            duration: 30,
            emitters: [
                {
                    name: "mark_core", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 24 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [7, 13], size: [0.26, 0.03], sizeMode: "index",
                    color: 0xCFEFFF, alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "mark_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 34 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [12, 18], size: [0.34, 0.16],
                    color: 0x6AD8FF, alpha: [0.55, 0], light: "full", maxParticles: 60
                },
                {
                    name: "mark_bird", bind: "target", offset: [0, 0.3, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 5, interval: 3, repeats: 3 }, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.24, 0.12], sizeMode: "sin",
                    color: 0x6AD8FF, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        },
        linger: {
            exit: { drain: 36 },
            emitters: [
                {
                    name: "linger_bird", bind: "target", offset: [0, 0.35, 0], height: 1.08,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 4, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 30], size: [0.2, 0.08], sizeMode: "sin",
                    color: 0x6AD8FF, alpha: [0.42, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "linger_note", bind: "target", offset: [0, 0.15, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 3, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 28], size: [0.12, 0.04],
                    color: 0xB6EEFF, alpha: [0.35, 0], light: "full", maxParticles: 16
                }
            ]
        },
        fumble: {
            duration: 24,
            emitters: [
                {
                    name: "fumble_swirl", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.26, 0.06], sizeMode: "index",
                    color: 0x2F6FA8, alpha: [0.9, 0], light: "full", bloom: 0.2
                },
                {
                    name: "fumble_note", bind: "target", offset: [0, 0.2, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 5, interval: 3, repeats: 2 }, shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [12, 20], size: [0.18, 0.08], sizeMode: "sin",
                    color: 0x6AD8FF, alpha: [0.5, 0], light: "full", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_supersonic", 1, SupersonicDefinition);
