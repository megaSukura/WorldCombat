/**
 * 回声 / echoedvoice 的客户端表现。
 *
 * 一句话：施法者吸气、声点在喉头收成环 → 一声唱出去、声波沿直线掠向目标 → 命中处一层层声环荡开，
 *   层数越多环越多越亮；没命中就在尽头散成一点残响。
 * 色相家族：清冷的青白（0x8FD8FF / 0xDCF4FF）为主体，近白只给命中核心；与轮唱的暖金分开，一眼能认出「这是回声」。
 * 拍子：起 inhale（吸气聚声）→ 唱 release（声波掠过）→ 击 impact（层层声环荡开）→ 散 miss。
 * 范围：release 用与判定同一起止 `data.path` 画声波走的那条线；impact 的声环按 `data.scale`（声环半径 / 0.9）收束。
 * 运动：声点沿 path 从施法者掠向目标、速度由 `data.speed`（声速）驱动；命中的声环一圈圈向外荡。
 * 数：impact 的声环条数绑定 `data.layer`（当前回声层数），声点数绑定 `data.motes`（特攻与等级换算）。
 */
const EchoedvoiceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "inhale_draw", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8FD8FF, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 30
                },
                {
                    name: "inhale_ring", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 6, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.24, 0.08], sizeMode: "linear",
                    color: 0xDCF4FF, alpha: [0.5, 0], light: "full", maxParticles: 14
                }
            ]
        },
        release: {
            duration: 28,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "release_wave", bind: "path", fit: "none", offset: [0, 0.65, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "motes", fallback: 8 }, at: 0 },
                    rate: 20, direction: "shape", speed: { data: "speed", fallback: 1.2 }, spread: 10,
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0x8FD8FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "release_streak", bind: "path", fit: "none", offset: [0, 0.65, 0],
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "motes", fallback: 6 }, at: 0 },
                    rate: 16, direction: "shape", speed: { data: "speed", fallback: 1.2 },
                    lifetime: [6, 11], size: [0.14, 0.02],
                    color: 0xDCF4FF, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "release_pulse", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, repeats: { data: "layer", fallback: 1 }, interval: 4 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.28, 0.7], sizeMode: "linear",
                    color: 0x8FD8FF, alpha: [0.45, 0], light: "full", maxParticles: 20
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "impact_rings", bind: "target", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1, repeats: { data: "layer", fallback: 1 }, interval: 4 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.3, { data: "scale", fallback: 1 }], sizeMode: "linear",
                    color: 0x8FD8FF, alpha: [0.6, 0], light: "full", bloom: 0.2, maxParticles: 24
                },
                {
                    name: "impact_spark", bind: "target", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 8 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [8, 15], size: [0.11, 0.02],
                    color: 0xDCF4FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "impact_core", bind: "target", offset: [0, 0.55, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/aura_white",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.3, 0.06],
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", maxParticles: 6
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 10 },
            emitters: [
                {
                    name: "miss_ring", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.5], sizeMode: "linear",
                    color: 0x6FA8C8, alpha: [0.45, 0], light: "world", maxParticles: 6
                },
                {
                    name: "miss_mote", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 3, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.04, drag: 0.95,
                    lifetime: [12, 20], size: [0.09, 0.01],
                    color: 0x8FD8FF, alpha: [0.5, 0], light: "world", maxParticles: 10
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_echoedvoice", 1, EchoedvoiceDefinition);
