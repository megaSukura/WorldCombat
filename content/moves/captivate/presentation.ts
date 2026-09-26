/**
 * 诱惑 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者抬眸，一缕暖粉色的眼神沿直线钻进对手心里；献舞时同一份心绪绕身转成一圈短光带，
 *   被这份注视真正迷住的人才在头顶炸开一圈心。
 *
 * 色相家族：暖玫瑰粉（0xF28FB0／0xE86F9E）为主体，近白粉（0xFFD9E6／0xFFE3EC）只做高光小点，
 *   灰白（0xCCCCCC）只在免疫与顶到负阶底线时出现。没有第二个色相。
 * 层次：聚神（起手）→ 眼神线（回眸，沿 data.path 从施法者连到目标）→ 心爆（真正被迷住）→
 *   旋身光带＋覆盖圈（献舞）→ 灰白落空（免疫／无效）→ 头顶余韵（持续）→ 淡雾（空放）。
 * 起击收：windup（聚神）→ gaze（回眸的眼神线）→ charm／dance（落到人身上）→ ward／immune（没吃下）→ linger。
 * 数：charm 的心爆与 dance 的心环数量按服务端 data.hearts 派生，越重的心绪炸得越密；
 *   gaze 的线上高光数按 data.motes；dance 的圈半径读 data.radius，画的正是机制覆盖的那块区域。
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
                    name: "gaze_wait", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 6, shape: { kind: "ring", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.05],
                    lifetime: [10, 16], size: [0.22, 0.1],
                    color: 0xFFD9E6, alpha: [0.3, 0], light: "full", maxParticles: 16
                }
            ]
        },
        gaze: {
            duration: 22,
            emitters: [
                {
                    name: "eye_line", bind: "path", offset: [0, 0.75, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 20 }, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.14, 0.04], sizeMode: "index",
                    color: 0xF2A0BC, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "eye_glint", bind: "path", offset: [0, 0.75, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    shape: { kind: "polyline" },
                    rate: 10, direction: "shape", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xFFE3EC, alpha: [0.9, 0], light: "full", maxParticles: 40
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
                    name: "spin_band", bind: "source", offset: [0, 0.8, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 30, shape: { kind: "torus", radius: 0.48, thickness: 0.07 },
                    direction: "outward", speed: [0.01, 0.05], spin: 26,
                    lifetime: [8, 14], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xF2A0BC, alpha: [0.75, 0], light: "full", maxParticles: 60
                },
                {
                    name: "dance_ring", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "hearts", fallback: 26 } }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.2 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.32, 0.6],
                    color: 0xE86F9E, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "dance_hearts", bind: "point", height: 0.3, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 26 }, interval: 4, repeats: 3 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.2 } },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [16, 26], size: [0.22, 0.08], sizeMode: "sin",
                    color: 0xF2A0BC, alpha: [0.7, 0], light: "full", maxParticles: 80
                }
            ]
        },
        ward: {
            duration: 18,
            emitters: [
                {
                    name: "ward_fade", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xCCCCCC, alpha: [0.4, 0], light: "world", maxParticles: 20
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
