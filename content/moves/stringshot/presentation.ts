/**
 * 吐丝 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：从口边射出一缕银白的丝，丝身后拖着速度线；缠上对手时爆开一小团棉絮般的丝结，把腿脚裹住；
 *   结网时丝落在地上摊成一张网，铺开的一圈就是它黏人的范围。
 *
 * 色相家族：近白丝（0xF2F0E8）与冷灰（0xE6E2D6／0xD9DED8）为主体，深一点的灰只做细节。没有第二个色相。
 * 层次：丝光（起手）→ 丝身＋速度线（飞行）→ 丝结＋裹身环（缠住）→ 地面蛛网（结网）→
 *   小丝结（落空）→ 未干丝光（持续）。
 * 起击收：windup（蓄丝）→ strand（丝飞出去）→ bind／net（落到人身上或地上）→ linger（缠着还在）。
 * 数：缠住时爆开的丝量按服务端 data.coils 派生；结网的网面量按 data.threads，画出的圈半径读 data.radius。
 */
const StringShotDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "silk_gather", bind: "source", offset: [0, 0.25, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 18, shape: { kind: "sphere", radius: 0.18 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.12, 0.02],
                    color: 0xF2F0E8, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        strand: {
            duration: 20,
            emitters: [
                {
                    name: "strand_wisp", bind: "projectile", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 30, shape: { kind: "sphere", radius: 0.12 },
                    direction: "velocity", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.14, 0.03], spin: 14,
                    color: 0xF2F0E8, alpha: [0.85, 0], light: "full", maxParticles: 50
                },
                {
                    name: "strand_dash", bind: "projectile", height: 0.15, trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 3, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xD9DED8, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        },
        bind: {
            duration: 28,
            emitters: [
                {
                    name: "bind_core", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "coils", fallback: 18 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.2], spread: 24,
                    lifetime: [8, 14], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xEDEDED, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "bind_wrap", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 20], size: [0.18, 0.06],
                    color: 0xD9DED8, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "bind_thread", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 20, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0xF2F0E8, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        net: {
            duration: 34,
            emitters: [
                {
                    name: "net_ring", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 40 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.0 } },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.3, 0.7],
                    color: 0xE6E2D6, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "net_web", bind: "point", height: 0.16,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: { data: "threads", fallback: 34 }, interval: 4, repeats: 2 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.0 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [16, 28], size: [0.2, 0.05],
                    color: 0xE6E2D6, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "net_dust", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, shape: { kind: "circle", radius: { data: "radius", fallback: 2.0 } }, direction: "up",
                    speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF2F0E8, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        tangle: {
            duration: 22,
            emitters: [
                {
                    name: "tangle_knot", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [12, 22], size: [0.14, 0.04],
                    color: 0xE6E2D6, alpha: [0.5, 0], light: "world", maxParticles: 24
                },
                {
                    name: "tangle_dust", bind: "point", height: 0.18,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.06], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xF2F0E8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_silk", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/cotton",
                    rate: 3, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0xE6E2D6, alpha: [0.35, 0], light: "world", maxParticles: 14
                },
                {
                    name: "linger_dust", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xF2F0E8, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stringshot", 1, StringShotDefinition);
