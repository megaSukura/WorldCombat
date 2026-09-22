/**
 * 泪眼汪汪 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者眼圈红起，一层淡蓝的泪光从脸上涌出来，朝对面的敌人洒落成一片泪滴；
 *   放声大哭时同一份泪光沿面前的扇形推出去；被说中的人头顶持续落下零星泪珠。
 *
 * 色相家族：淡蓝（0x7FB3E0／0xBFD6EE）为主体，近白蓝（0xEAF3FF）只做泪光高光。
 * 层次：眼角泪光（起手）→ 洒落泪滴＋高光（含泪）→ 前推泪扇（放声）→ 头顶余韵（持续）→ 灰蓝（被挡下）。
 * 起击收：windup（蓄泪）→ tears／sob（落到对方身上）→ linger（失落还在，慢慢离场）。
 * 数：泪滴数量读服务端 data.tears，伤得越重越密；放声的泪扇覆盖读 data.radius，
 *   线的朝向读 data.direction，画的正是机制里那片扇形。
 */
const TearfullookDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "tearfullook_well", bind: "source", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 12, shape: { kind: "sphere", radius: 0.12 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x7FB3E0, alpha: [0.6, 0], light: "full", maxParticles: 20
                }
            ]
        },
        tears: {
            duration: 28,
            emitters: [
                {
                    name: "tearfullook_fall", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "tears", fallback: 20 } }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "down", speed: [0.02, 0.06], gravity: 0.03,
                    lifetime: [10, 18], size: [0.09, 0.01], sizeMode: "index",
                    color: 0x7FB3E0, alpha: [0.85, 0], light: "full", maxParticles: 80
                },
                {
                    name: "tearfullook_shine", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "tears", fallback: 20 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.08], spread: 25,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xEAF3FF, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        sob: {
            duration: 32,
            emitters: [
                {
                    name: "tearfullook_wave", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "tears", fallback: 24 }, interval: 4, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.14, 0.02],
                    color: 0x7FB3E0, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "tearfullook_gust", bind: "point", height: 0.5, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 30, shape: { kind: "line", length: { data: "radius", fallback: 3 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 16], size: [0.12, 0.02],
                    color: 0xBFD6EE, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        blocked: {
            duration: 20,
            emitters: [
                {
                    name: "tearfullook_block", bind: "point", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.07],
                    lifetime: [10, 16], size: [0.2, 0.08],
                    color: 0x9FB2C8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "tearfullook_linger", bind: "target", height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 3, shape: { kind: "circle", radius: 0.2 },
                    direction: "down", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0x7FB3E0, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 14
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "tearfullook_fizzle", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x7FB3E0, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tearfullook", 1, TearfullookDefinition);
