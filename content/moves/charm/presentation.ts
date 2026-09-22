/**
 * 撒娇 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者抬眼，一串暖粉色的心沿视线飞进对手心里，在它身上炸开一圈心；被撒娇的人头顶慢慢浮起心软的心。
 *
 * 色相家族：暖玫瑰粉（0xF28FB0／0xE86F9E）为主体，近白粉（0xFFD9E6／0xFFE3EC）只做高光小点，
 *   灰白（0xCCCCCC）只在被挡住那一刻出现。没有第二个色相。
 * 层次：抬眼（起手，施法者身上聚心）→ 一条心线＋心爆＋心环（落到人身上）→ 头顶余韵（持续）→ 淡雾（落空／被挡）。
 * 起击收：windup（聚心）→ charm（飞向人、落到人身上）→ linger（心软还在，慢慢离场）。
 * 范围：单体招，心爆与心环都绑在目标身上，画的正是被撒娇的那个人；被掩体挡住时只在原地点一层灰心。
 * 运动：心沿 source→target 的视线飞过去（bind path polyline），命中后在目标身上向外炸开、再绕着上升。
 * 数：心线与心爆的数量读服务端 data.hearts（特攻派生），越强的施法者洒得越密；drop 决定心环的密度。
 */
const CharmDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "charm_gather", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 13, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xFFD9E6, alpha: [0.55, 0], light: "full", maxParticles: 30
                }
            ]
        },
        charm: {
            duration: 30,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "charm_line", bind: "path", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    shape: { kind: "polyline" },
                    rate: { data: "hearts", fallback: 20 }, direction: "shape", speed: [0.05, 0.16], spread: 18,
                    lifetime: [10, 18], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0xF2A0BC, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "charm_burst", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 20 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16], spread: 30,
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xF28FB0, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 80
                },
                {
                    name: "charm_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "hearts", fallback: 20 } }, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.09],
                    lifetime: [12, 18], size: [0.3, 0.14],
                    color: 0xE86F9E, alpha: [0.45, 0], light: "full", maxParticles: 40
                },
                {
                    name: "charm_spark", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.14], spread: 20,
                    lifetime: [10, 20], size: [0.09, 0.01],
                    color: 0xFFE3EC, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_hearts", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 3, shape: { kind: "circle", radius: 0.28 },
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
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "blocked_fade", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    rate: 10, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xCCCCCC, alpha: [0.4, 0], light: "world", maxParticles: 24
                },
                {
                    name: "blocked_dust", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xCCCCCC, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF2A0BC, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_charm", 1, CharmDefinition);
