/**
 * 毒丝 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者朝对手吐出一缕紫色的毒丝，丝头扎进对手身上，沿丝线灌进毒、再猛地一抽；被缠住的人
 *   身上一直挂着未干的紫丝。
 *
 * 色相家族：毒紫（0x8E44AD／0x6C3483）为主体，近白（0xE9DDF3）只做命中与丝光的高光小点。没有第二个色相。
 * 层次：蓄毒（起手）→ 丝身＋毒泡（飞行）→ 丝结＋毒爆＋丝线（缠住）→ 垂丝毒渍（落空）→ 未干紫丝（持续）。
 * 起击收：windup（蓄丝）→ spit（吐出去）→ latch（缠住）→ linger（还缠着）。
 * 数：丝股与毒爆数量由服务端 data.threads 派生；缠住那一刻的丝线由 data.path 的两端（施法者、目标）
 *   撑起，画的正是收丝/钉住作用的那条线。
 */
const ToxicThreadDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "venom_gather", bind: "source", offset: [0, 0.2, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 18, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.12, 0.02],
                    color: 0x8E44AD, alpha: [0.7, 0], light: "full", maxParticles: 30
                },
                {
                    name: "venom_bubble", bind: "source", offset: [0, 0.2, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 6, shape: { kind: "sphere", radius: 0.12 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.09, 0.01],
                    color: 0xE9DDF3, alpha: [0.5, 0], light: "full", maxParticles: 16
                }
            ]
        },
        spit: {
            duration: 20,
            emitters: [
                {
                    name: "spit_thread", bind: "projectile", height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: { data: "threads", fallback: 18 }, shape: { kind: "sphere", radius: 0.1 },
                    direction: "velocity", speed: [0.01, 0.05], spin: 18,
                    lifetime: [8, 14], size: [0.18, 0.03],
                    color: 0x8E44AD, alpha: [0.9, 0], light: "full", maxParticles: 50
                },
                {
                    name: "spit_goo", bind: "projectile", height: 0.15, trail: { minDistance: 0.28 },
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 2, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "shape", speed: [0.0, 0.03],
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0x6C3483, alpha: [0.6, 0], light: "world", maxParticles: 36
                }
            ]
        },
        latch: {
            duration: 28,
            emitters: [
                {
                    name: "latch_line", bind: "path", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: { data: "threads", fallback: 18 }, shape: { kind: "polyline" },
                    speed: [0.0, 0.02], spin: 12,
                    lifetime: [6, 12], size: [0.14, 0.02],
                    color: 0x8E44AD, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "latch_core", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: { data: "threads", fallback: 18 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.05, 0.18], spread: 24,
                    lifetime: [8, 14], size: [0.26, 0.04], sizeMode: "index",
                    color: 0x8E44AD, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "latch_beads", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 14 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.1], gravity: 0.05,
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0xE9DDF3, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        droop: {
            duration: 22,
            emitters: [
                {
                    name: "droop_thread", bind: "point", height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.01, 0.05], gravity: 0.12, drag: 0.9,
                    lifetime: [12, 22], size: [0.14, 0.03],
                    color: 0x8E44AD, alpha: [0.6, 0], light: "world", maxParticles: 24
                },
                {
                    name: "droop_goo", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/goo/ooze",
                    rate: 8, shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.03], gravity: 0.1,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x6C3483, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_silk", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/wrap",
                    rate: 3, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.03], spin: 10,
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0x8E44AD, alpha: [0.35, 0], light: "world", maxParticles: 14
                },
                {
                    name: "linger_beads", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 4, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.05, 0.01],
                    color: 0xE9DDF3, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_toxicthread", 1, ToxicThreadDefinition);
