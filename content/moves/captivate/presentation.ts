/**
 * 诱惑 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者抬眸，一缕暖粉色的视线沿直线钻进对手心里；被盯住的人身上炸开一圈心，头顶慢慢浮起沉迷的心。
 *   献舞时同一份心绪绕身摊成一圈，把身边的人都卷进来。
 *
 * 色相家族：暖玫瑰粉（0xF28FB0／0xE86F9E）为主体，近白粉（0xFFD9E6／0xFFE3EC）只做高光小点，
 *   灰白（0xCCCCCC）只在免疫那一刻出现。没有第二个色相。
 * 层次：视线（起手，施法者身上升起）→ 心环＋心爆（命中）→ 粉点（细节）→ 旋舞圈（献舞）→
 *   头顶余韵（持续）→ 淡雾（免疫／落空）。
 * 起击收：windup（聚神）→ charm／dance（落到人身上）→ linger（迷醉还在，慢慢离场）。
 * 数：charm 的心爆与 dance 的心环数量按服务端 data.hearts 派生，越重的心绪炸得越密；
 *   dance 的圈半径读 data.radius，画的正是机制覆盖的那块区域。
 */
const CaptivateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            emitters: [
                {
                    name: "gaze_rise", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 14, shape: { kind: "cylinder", radius: 0.16, length: 0.9 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xF2A0BC, alpha: [0.5, 0], light: "full", maxParticles: 26
                },
                {
                    name: "gaze_wait", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 6, shape: { kind: "ring", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.05],
                    lifetime: [10, 16], size: [0.22, 0.1],
                    color: 0xFFD9E6, alpha: [0.3, 0], light: "full", maxParticles: 16
                }
            ]
        },
        charm: {
            duration: 30,
            emitters: [
                {
                    name: "charm_core", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 24 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.16], spread: 30,
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xF28FB0, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 70
                },
                {
                    name: "charm_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 34 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.09],
                    lifetime: [12, 18], size: [0.3, 0.14],
                    color: 0xE86F9E, alpha: [0.45, 0], light: "full", maxParticles: 40
                },
                {
                    name: "charm_spark", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 18 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.14], spread: 20,
                    lifetime: [10, 20], size: [0.09, 0.01],
                    color: 0xFFE3EC, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        dance: {
            duration: 34,
            emitters: [
                {
                    name: "dance_ring", bind: "point", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "hearts", fallback: 26 } }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.32, 0.6],
                    color: 0xE86F9E, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "dance_hearts", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 26 }, interval: 4, repeats: 3 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [16, 26], size: [0.22, 0.08], sizeMode: "sin",
                    color: 0xF2A0BC, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "dance_dust", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 20, shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFE3EC, alpha: [0.6, 0], light: "full", maxParticles: 50
                }
            ]
        },
        immune: {
            duration: 20,
            emitters: [
                {
                    name: "immune_fade", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    rate: 12, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xCCCCCC, alpha: [0.4, 0], light: "world", maxParticles: 24
                },
                {
                    name: "immune_dust", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xCCCCCC, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_hearts", bind: "target", offset: [0, 0.35, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 3, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 28], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xF2A0BC, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "linger_orbs", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 4, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0xFFD9E6, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF2A0BC, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_captivate", 1, CaptivateDefinition);
