/**
 * 金属音 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把身上的金属片相互蹭响，蹭出一串冷金色的火花 → 一道颤动的声纹沿视线一头扎进对手体内、
 *   绕它拉出一圈圈长长的回响 → 对手被磨得护住耳朵，身上持续荡着残余的金属声纹。
 *
 * 色相家族：黄铜金（0xC9B04C／0xE0C46A）与钢灰（0x9AA0A8）为主体，近白（0xF4EEC8）只给摩擦的高光；
 *   没有第二个色相。
 * 层次：摩擦火花（起手）→ 声纹沿视线推进＋音符（击）→ 对手身上的钢灰爆点（结果）→ 环绕的长回响（持续）。
 * 起击收：windup（蹭响）→ grate（声纹送过去、只播一次）→ hit（对手身上炸开）→ linger（回响慢慢散去）。
 * 范围：grate 的声纹用 `data.path` 两端（施法者与目标）画在视线之外——声音不需要视线，画面上它直接穿过去。
 * 运动：声纹沿两端连线从施法者推进到目标；回响在目标身上一层层向外扩。
 * 数：grate 的密度绑 `data.cycles`（体重派生），对手身上的爆点数量绑 `data.sparks`（掉级派生）。
 */
const MetalSoundDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "scrape", bind: "source", offset: [0, 0.1, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 10, interval: 4, repeats: 4 },
                    shape: { kind: "circle", radius: 0.3, rotation: [0, 0, 40] },
                    direction: "outward", speed: [0.08, 0.24], spread: 20, spin: 24,
                    lifetime: [5, 10], size: [0.09, 0.02], sizeMode: "index",
                    color: 0xE0C46A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "scrape_sound", bind: "source", offset: [0, 0.35, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, interval: 5, repeats: 4 },
                    shape: { kind: "ring", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.16, 0.36],
                    color: 0x9AA0A8, alpha: [0.55, 0], light: "world", maxParticles: 16
                }
            ]
        },
        grate: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "resonance", bind: "path", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    shape: { kind: "polyline" },
                    rate: { data: "cycles", fallback: 12 }, direction: "shape", speed: [0.05, 0.18], spread: 8, spin: 6,
                    lifetime: [10, 18], size: [0.26, 0.08], sizeMode: "index",
                    color: 0xC9B04C, alpha: [0.6, 0], light: "full", maxParticles: 90
                },
                {
                    name: "notes", bind: "path", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/note",
                    shape: { kind: "polyline" },
                    rate: { data: "cycles", fallback: 12 }, direction: "up", speed: [0.02, 0.08], roll: [0, 360],
                    lifetime: [10, 16], size: [0.16, 0.04],
                    color: 0xF4EEC8, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "filings", bind: "path", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    shape: { kind: "polyline" },
                    rate: { data: "cycles", fallback: 12 }, direction: "outward", speed: [0.06, 0.2], spread: 24, gravity: 0.03,
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0x9AA0A8, alpha: [0.8, 0], light: "world", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "sparks", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.2], spread: 26,
                    lifetime: [8, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xC9B04C, alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 44
                },
                {
                    name: "hit_ripple", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.3, 0.72],
                    color: 0x9AA0A8, alpha: [0.55, 0], light: "world", maxParticles: 26
                }
            ]
        },
        linger: {
            exit: { drain: 34 },
            emitters: [
                {
                    name: "linger_resonance", bind: "target", offset: [0, 0.35, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 3, shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: [16, 26], size: [0.2, 0.42],
                    color: 0xC9B04C, alpha: [0.35, 0], alphaMode: "sin", light: "world", maxParticles: 12
                },
                {
                    name: "linger_filings", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x9AA0A8, alpha: [0.4, 0], light: "world", maxParticles: 14
                }
            ]
        },
        fizzle: {
            duration: 14,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x9AA0A8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_metalsound", 1, MetalSoundDefinition);
