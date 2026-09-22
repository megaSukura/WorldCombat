/**
 * 挠痒 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者的指尖跳起一串暖黄的碎点，贴上对手身上炸开一层笑点；被挠中的人头顶不断冒出笑意星星。
 *
 * 色相家族：暖黄（0xF2C94C／0xF7DF8A）为主体，近白黄（0xFFF6D9）只做贴上那一刻的小亮点。
 * 层次：指尖碎点（起手）→ 接触笑爆（命中）→ 笑意余韵（持续）→ 淡尘（落空）。
 * 起击收：windup（跳动）→ fit（贴上去炸开）→ linger（笑还在，慢慢离场）。
 * 数：接触爆的碎点数量读服务端 data.sparks，挠得越快越密；猛挠时同一份碎点更亮更远（data.firm）。
 */
const TickleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "tickle_fingers", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 16, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.09, 0.01], sizeMode: "index",
                    color: 0xF7DF8A, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        fit: {
            duration: 28,
            emitters: [
                {
                    name: "tickle_burst", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "sparks", fallback: 20 } }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.16], spread: 40, spin: 12,
                    lifetime: [10, 18], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xF2C94C, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "tickle_spark", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "sparks", fallback: 20 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], spread: 25,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xFFF6D9, alpha: [0.95, 0], light: "full", maxParticles: 80
                },
                {
                    name: "tickle_ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 28 }, shape: { kind: "ring", radius: 0.36 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [10, 16], size: [0.26, 0.1],
                    color: 0xF7DF8A, alpha: [0.5, 0], light: "full", maxParticles: 36
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "tickle_linger", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 4, shape: { kind: "circle", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xF7DF8A, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 14
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "tickle_fizzle", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xF2C94C, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_tickle", 1, TickleDefinition);
