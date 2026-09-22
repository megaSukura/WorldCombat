/**
 * 魅诱之声 / alluringvoice 的粒子语言。
 *
 * 一句话：施法者身前先亮起一排音符与心形、随吸气往喉口收 → 一整条天使般的窄声场朝前荡开，音符沿声场的
 * 两条边线飞出、粉白光粒填满整片锥形 → 被唱中的普通目标炸开一圈粉光，而正带着强化的目标头顶开始绕着
 * 一圈迷乱的飞鸟，挥之不去；被惑乱者一旦用力打空，还会在它身上炸出反噬的乱光。
 *
 * 色相家族：天使粉（0xF2A0C8）作主体与声场，近白粉（0xFFEAF4）给命中闪，金粉（0xFFD9A0）只点缀音符号，
 * 余韵用暗粉烟（0x8A4A68）。
 * 拍子：起 charge（14t）→ 唱 wave（30t）→ 击 hit（26t，逐目标）→ 持 daze／linger（逐刻续期）→ 反噬 fumble。
 *
 * 范围：wave 的发射器绑 `data.path`（服务端 alluringVoiceFan 生成的锥形顶点），用 polygon／polyline 画出整片声场；
 * 玩家一眼知道站在锥形里会被唱到。
 * 运动：音符沿锥形边线朝外飞、心形向上飘；声场随 path 顶点固定在世界上。
 * 机制驱动：`data.motes`（特攻派生的音符数）决定 wave 的密度，`data.stages`（命中目标里最高的正面等级）与
 * `data.intensity` 决定 wave 与 daze 的强度，`data.scale`（声场半径 / 7）决定声场的尺寸。
 */
const AlluringVoiceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 起：吸气起调，音符与心在身前收拢。
        charge: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "charge_notes", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: 18, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.28, 0.06], sizeMode: "sin",
                    color: 0xF2A0C8, alpha: [0.6, 0], light: "full", maxParticles: 50
                },
                {
                    name: "charge_hearts", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 10, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xFFEAF4, alpha: [0.45, 0], light: "full", maxParticles: 30
                }
            ]
        },
        // 唱：整条声场，顶点就是判定区域。
        wave: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "wave_notes", bind: "path", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/note",
                    rate: { data: "motes", fallback: 24 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.04, 0.16],
                    lifetime: [8, 16], size: [0.3, 0.08], sizeMode: "sin",
                    color: 0xF2A0C8, alpha: [0.8, 0], light: "full", maxParticles: 180
                },
                {
                    name: "wave_fill", bind: "path", offset: [0, 0.07, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 40, shape: { kind: "polygon" },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [7, 14], size: [0.16, 0.04],
                    color: 0xFFEAF4, alpha: [0.65, 0], light: "full", maxParticles: 200
                },
                {
                    // Edge height reads data.stages: the more the struck target had raised, the brighter the sweep.
                    name: "wave_edge", bind: "point", fit: "none", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 20, interval: 3, repeats: 2 }, shape: { kind: "cylinder", radius: 0.4, length: { data: "rise", fallback: 1.0 } },
                    direction: "up", speed: [0.05, 0.2],
                    lifetime: [8, 16], size: [0.18, 0.04],
                    color: 0xFFD9A0, alpha: [0.7, 0], light: "full", maxParticles: 120
                },
                {
                    name: "wave_smoke", bind: "point", fit: "none", offset: [0, 0.14, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                    burst: { count: 12, interval: 4, repeats: 2 }, shape: { kind: "circle", radius: 0.9 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [18, 30], size: [0.32, 0.5],
                    color: 0x8A4A68, alpha: [0.28, 0], light: "world", maxParticles: 50
                }
            ]
        },
        // 击：命中者身上炸开一圈粉光。
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 14, at: 1 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [7, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFEAF4, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "hit_notes", bind: "target", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "motes", fallback: 8 } }, shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [10, 18], size: [0.24, 0.05],
                    color: 0xF2A0C8, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        // 持（混乱）：被惑乱的目标头顶绕着一圈飞鸟，低密度、让出本体视线。
        daze: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "daze_bird", bind: "target", offset: [0, 0.75, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 8, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.2, 0.04],
                    color: 0xF2A0C8, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        // 持（存续）：低密度的粉点提示错乱还在。
        linger: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "linger_motes", bind: "target", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 5, shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xFFEAF4, alpha: [0.3, 0], light: "full", maxParticles: 16
                }
            ]
        },
        // 反噬：用力却伤到自己时，身上炸开一圈乱光。
        fumble: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "fumble_bird", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 8 }, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 16], size: [0.22, 0.05],
                    color: 0xF2A0C8, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_alluringvoice", 1, AlluringVoiceDefinition);
