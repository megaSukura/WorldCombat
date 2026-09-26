/**
 * 金属音 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把身上的金属片相互蹭响，蹭出一串冷金色的火花，并由施法者到目标拉出一条持续颤动的连接纹；
 *   每刮过一次，就有一道锯齿声纹抵达目标、把它身上一环金属崩开 → 对手被磨得护住耳朵，身上持续荡着残余声纹。
 *
 * 色相家族：黄铜金（0xC9B04C／0xE0C46A）与钢灰（0x9AA0A8）为主体，近白（0xF4EEC8）只给摩擦的高光；
 *   没有第二个色相。
 * 层次：摩擦火花（起手）→ 施法者到目标的连接纹（磨音期间）→ 每次抵达的锯齿声纹与崩开的金属环（逐级）→
 *   环绕的长回响（持续）→ 被距离扯断时的散点（收束）。
 * 起击收：windup（蹭响）→ grate（连接纹，磨音期间持续、离距或结束后 stop 收束）→ scrape（每一级各一次）→
 *   snap（离距断线）／linger（回响慢慢散去）。
 * 范围：grate 的连接纹用 `data.path` 两端（施法者与目标）画出，就是声音真正穿过掩体连到的那条线。
 * 运动：连接纹沿两端连线颤动；每次 scrape 的锯齿环在目标身上一层层向外崩开。
 * 数：grate 的密度绑 `data.cycles`（体重派生），每次 scrape 的爆点数量绑 `data.sparks`（已刮级数派生）。
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
            duration: 44,
            exit: { stop: 6, drain: 12 },
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
        scrape: {
            duration: 24,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "scrape_tooth", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [9, 15], size: [0.3, 0.62],
                    color: 0xF4EEC8, alpha: [0.85, 0], light: "full", maxParticles: 8
                },
                {
                    name: "scrape_core", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "sparks", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.2], spread: 26,
                    lifetime: [8, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xC9B04C, alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 44
                },
                {
                    name: "scrape_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [10, 18], size: [0.3, 0.72],
                    color: 0x9AA0A8, alpha: [0.55, 0], light: "world", maxParticles: 26
                }
            ]
        },
        snap: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "snap_scatter", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "sparks", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30, gravity: 0.04,
                    lifetime: [8, 14], size: [0.09, 0.02], sizeMode: "index",
                    color: 0xC9B04C, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "snap_ring", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [8, 14], size: [0.24, 0.5],
                    color: 0x9AA0A8, alpha: [0.5, 0], light: "world", maxParticles: 6
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
