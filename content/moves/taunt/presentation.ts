/**
 * 挑衅 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者隔空骂出一句，一道红怒沿指向砸在目标身上炸开；目标从此顶着怒火，越烧越旺，
 * 直到怒火自行褪去或被人硬压下去。
 *
 * 色相家族：怒火红（0xC0392B）为主体与持续，橙红（0xE2531B）做强调，深红近黑（0x3A0A0A）做烟，
 * 近白只做高光小点。落空时改播灰白（0x9AA0A6）——「话没传到」与「点着了」两种结果一眼可分。
 * 层次：聚怒（起手，源侧）／声浪（出口，源侧沿指向）／炸开＋内收环（命中，目标侧）／
 * 怒火（持续，目标头顶与脚边）／散尽（收）。
 * 起击收：windup（聚怒）→ shout（出口）→ taunt（炸开并留下怒火）→ goad（注意转向施法者）→ rage（持续）→ fade／subside（收）。
 * 数：出口与炸开的爆发量绑定服务端算出的 data.rage；持续怒火密度随 data.intensity 变化，
 * 该强度由标记剩余比例（data.surge）派生；落空的灰白小爆绑定同一 rage，只换色相。
 * goad 只在 world.target 真的把敌人注意拉向施法者时播放：一条沿 data.direction 的怒线从目标指向施法者。
 */
const TauntDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: 8, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.24, 0.08], sizeMode: "sin",
                    color: 0xC0392B, alpha: [0.85, 0], light: "full", maxParticles: 24
                },
                {
                    name: "gather_smoke", bind: "source", height: 0.3, offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 7, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 30], size: [0.22, 0.06],
                    color: 0x3A0A0A, alpha: [0.22, 0], light: "world", maxParticles: 32
                }
            ]
        },
        shout: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "shout_marks", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: { data: "rage", fallback: 18 } }, shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: [{ data: "direction.0", fallback: 1 }, { data: "direction.1", fallback: 0 }, { data: "direction.2", fallback: 0 }],
                    speed: [0.14, 0.4], drag: 0.9,
                    lifetime: [8, 15], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xE2531B, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "shout_line", bind: "source", height: 0.72, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 34, shape: { kind: "line", length: { data: "reach", fallback: 10 } },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 11], size: [0.12, 0.03],
                    color: 0xC0392B, alpha: [0.55, 0], light: "full", maxParticles: 90
                }
            ]
        },
        taunt: {
            duration: 34,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "taunt_burst", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "rage", fallback: 22 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.26],
                    lifetime: [7, 13], size: [0.3, 0.03], sizeMode: "index",
                    color: 0xE2531B, alpha: [0.95, 0], light: "full", bloom: 0.3
                },
                {
                    name: "taunt_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 34 }, shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [12, 18], size: [0.32, 0.16],
                    color: 0xC0392B, alpha: [0.55, 0], light: "full", maxParticles: 60
                },
                {
                    name: "taunt_marks", bind: "target", offset: [0, 1.12, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: 4, interval: 4, repeats: 2 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 22], size: [0.24, 0.1], sizeMode: "sin",
                    color: 0xC0392B, alpha: [0.8, 0], light: "full", maxParticles: 16
                },
                {
                    name: "taunt_dust", bind: "target", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.1],
                    lifetime: [12, 22], size: [0.07, 0.02],
                    color: 0x3A0A0A, alpha: [0.5, 0], gravity: 0.02, drag: 0.95, light: "world", maxParticles: 36
                }
            ]
        },
        goad: {
            duration: 26,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "goad_line", bind: "target", height: 0.72, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 30, shape: { kind: "line", length: { data: "reach", fallback: 6 } },
                    direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 10], size: [0.1, 0.03],
                    color: 0xE2531B, alpha: [0.5, 0], light: "full", maxParticles: 60
                },
                {
                    name: "goad_marks", bind: "target", offset: [0, 1.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: 6, interval: 4, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.2, 0.05],
                    color: 0xC0392B, alpha: [0.8, 0], light: "full", maxParticles: 14
                }
            ]
        },
        rage: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "rage_marks", bind: "target", offset: [0, 1.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    rate: 4, burst: { count: { data: "motes", fallback: 4 }, interval: 18 },
                    shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.22, 0.08], sizeMode: "sin",
                    color: 0xC0392B, alpha: [0.6, 0], light: "full", maxParticles: 18
                },
                {
                    name: "rage_feet", bind: "target", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [20, 32], size: [0.13, 0.04], sizeMode: "sin",
                    color: 0xE2531B, alpha: [0.34, 0], alphaMode: "sin", light: "full", maxParticles: 16
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "miss_smoke", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.2, 0.32],
                    color: 0x9AA0A6, alpha: [0.3, 0], light: "world", maxParticles: 26
                },
                {
                    name: "miss_fade", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: 5 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.16, 0.02],
                    color: 0x6E4A46, alpha: [0.4, 0], light: "world", maxParticles: 10
                }
            ]
        },
        fade: {
            duration: 28,
            exit: { stop: 8, drain: 24 },
            emitters: [
                {
                    name: "fade_smoke", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [20, 34], size: [0.26, 0.44],
                    color: 0x3A0A0A, alpha: [0.24, 0], light: "world", maxParticles: 34
                },
                {
                    name: "fade_marks", bind: "target", offset: [0, 1.0, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 22], size: [0.2, 0.04],
                    color: 0xC0392B, alpha: [0.55, 0], light: "full", maxParticles: 18
                }
            ]
        },
        subside: {
            duration: 24,
            exit: { stop: 6, drain: 20 },
            emitters: [
                {
                    name: "subside_snap", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [6, 12], size: [0.24, 0.03], sizeMode: "index",
                    color: 0x8E1B1B, alpha: [0.8, 0], light: "full", maxParticles: 26
                },
                {
                    name: "subside_smoke", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [16, 26], size: [0.22, 0.34],
                    color: 0x3A0A0A, alpha: [0.3, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_taunt", 1, TauntDefinition);
