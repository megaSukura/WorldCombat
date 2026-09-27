/**
 * 诱惑 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者抬眸，一缕暖粉色的目光沿直线咬住对手；只要这道目光还连着，目标头顶就一直浮着沉迷的心；
 *   一断线，线立刻碎开，心光同时熄灭。它不绕身张开、不铺大片地面，只维持这一条线。
 *
 * 色相家族：暖玫瑰粉（0xF28FB0／0xE86F9E）为主体，近白粉（0xFFD9E6／0xFFE3EC）只做高光小点，
 *   灰白（0xCCCCCC）只在顶到负阶底线（ward）与掩体挡住（blocked）时出现。
 * 层次：聚神（windup）→ 咬住（lock，一次沿线的目光）→ 心爆（charm，真正被迷住）→
 *   持守（hold，整条目光维持期间持续发射）→ 余韵（linger，窗口还在时头顶的心）→ 绷断（break）／松开（release）→
 *   被挡（blocked）／淡雾（fizzle）。
 * 数：lock 的线上高光读 data.motes，charm 的心爆读 data.hearts，hold 的发射量读 data.motes，
 *   都是本招机制值；drop 越大线越密、心越亮。
 */
const CaptivateDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
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
        lock: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "lock_line", bind: "path", offset: [0, 0.75, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 20 }, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.14, 0.04], sizeMode: "index",
                    color: 0xF2A0BC, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 70
                },
                {
                    name: "lock_glint", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.12], spread: 25,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFE3EC, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        charm: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "charm_core", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 26 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.24 },
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
                }
            ]
        },
        hold: {
            duration: 0,
            exit: { stop: 0, drain: 22 },
            emitters: [
                {
                    name: "hold_line", bind: "path", offset: [0, 0.78, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 18 }, direction: "shape", speed: [0.01, 0.05],
                    lifetime: [8, 15], size: [0.13, 0.04], sizeMode: "index",
                    color: 0xF2A0BC, alpha: [0.6, 0], alphaMode: "sin", light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "hold_shiver", bind: "path", offset: [0, 0.82, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    shape: { kind: "polyline" },
                    rate: 8, direction: "shape", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xFFE3EC, alpha: [0.5, 0], alphaMode: "sin", light: "full", maxParticles: 26
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
                }
            ]
        },
        break: {
            duration: 20,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "break_snap", bind: "path", offset: [0, 0.78, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "motes", fallback: 18 }, repeats: 3, interval: 1 },
                    shape: { kind: "polyline" }, direction: "outward", speed: [0.08, 0.24], spread: 30,
                    lifetime: [8, 14], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xE86F9E, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "break_scatter", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFD9E6, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        release: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "release_fade", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [12, 20], size: [0.13, 0.03],
                    color: 0xF2A0BC, alpha: [0.45, 0], light: "world", maxParticles: 28
                }
            ]
        },
        blocked: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "blocked_scatter", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xCCCCCC, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        ward: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
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
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.35, fit: "none",
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
