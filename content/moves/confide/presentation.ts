/**
 * 密语 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者低头吐出一串低语，低语沿着一条线钻进对手的耳朵；被说中的人头顶不断冒起零碎的低语，
 *   传谣时同一份低语从目标身上一圈摊开。
 *
 * 色相家族：暗紫（0x8A7BD8／0xB9AEE8）为主体，近白紫（0xEDE9FF）只做入耳那一刻的小亮点。
 * 层次：喉间低语（起手）→ 低语线＋入耳爆点（命中）→ 失神余韵（持续）→ 外扩圈（传谣）→ 淡尘（落空）。
 * 起击收：windup（聚语）→ leak（送到耳边）→ rumor（摊开）→ linger（还在失神，慢慢离场）。
 * 数：低语线的密度与入耳爆点读服务端 data.whispers，越强的低语越密；传谣圈半径读 data.radius，
 *   画的正是机制覆盖的那块区域。
 */
const ConfideDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "confide_chamber", bind: "source", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.14 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8A7BD8, alpha: [0.5, 0], light: "full", maxParticles: 22
                }
            ]
        },
        leak: {
            duration: 26,
            emitters: [
                {
                    name: "confide_thread", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline" }, rate: { data: "whispers", fallback: 20 },
                    direction: "toward", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x8A7BD8, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "confide_line", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/note",
                    shape: { kind: "polyline" }, rate: 26,
                    direction: "toward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.14, 0.05], spin: 8,
                    color: 0xB9AEE8, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "confide_entry", bind: "target", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "whispers", fallback: 20 } }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.04, 0.12], spread: 30,
                    lifetime: [8, 16], size: [0.09, 0.01], sizeMode: "index",
                    color: 0xEDE9FF, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "confide_mind", bind: "target", height: 1.08,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    rate: 6, shape: { kind: "circle", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 24], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xB9AEE8, alpha: [0.35, 0], light: "full", maxParticles: 18
                }
            ]
        },
        rumor: {
            duration: 30,
            emitters: [
                {
                    name: "confide_ripple", bind: "point", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: { data: "whispers", fallback: 24 } },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 2 } },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.26, 0.5],
                    color: 0x8A7BD8, alpha: [0.5, 0], light: "full", maxParticles: 80
                },
                {
                    name: "confide_gossip", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: { data: "whispers", fallback: 24 }, interval: 4, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.13, 0.03],
                    color: 0xB9AEE8, alpha: [0.5, 0], light: "full", maxParticles: 80
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "confide_linger", bind: "target", height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    rate: 3, shape: { kind: "circle", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.02],
                    lifetime: [18, 28], size: [0.13, 0.03], sizeMode: "sin",
                    color: 0xB9AEE8, alpha: [0.25, 0], alphaMode: "sin", light: "full", maxParticles: 12
                }
            ]
        },
        fizzle: {
            duration: 14,
            emitters: [
                {
                    name: "confide_fizzle", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.02, 0.06], drag: 0.9,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0x8A7BD8, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_confide", 1, ConfideDefinition);
