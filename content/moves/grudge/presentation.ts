/**
 * 怨念 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者在脚下立起一圈幽紫的怨眼；一旦有人亲手把它打倒，怨念沿两人之间拉成一条线扑到凶手身上，
 *   把它刚才那一手的光抽干；凶手若没有可以记恨的招，怨念只空扑一场。
 *
 * 色相家族：幽紫（0x4B2E83）为主体与持续，暗紫近黑（0x1A1226）做底与烟，昏黄（0xE0A030）只做「被抽走」
 *   的高光小点——这是一种不属于任何属性的脏色，和同组同命的玫红一眼分开。
 * 层次：聚怨（起手，源侧）／怨眼（持续，源侧）／抽招（命中，两端）／空扑（收）／散去（收）。
 * 起击收：mark（聚怨）→ watch（怨眼）→ collect／wasted（收）→ lift（散）。
 * 数：怨眼半径绑 data.scale（实际半径 / 0.4），怨念量绑 data.motes（特攻派生），
 *   持续密度随 data.surge（剩余比例）；抽招用 data.path（倒下点 ↔ 凶手）画 polyline，谁被记恨、光被抽向哪边一眼可见。
 */
const GrudgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "mark_gather", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 20, shape: { kind: "ring", radius: 0.6 },
                    direction: "inward", speed: [0.02, 0.08], spin: 8,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x4B2E83, alpha: [0.75, 0], light: "full", maxParticles: 40
                },
                {
                    name: "mark_swirl", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 8, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0x1A1226, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        watch: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "watch_eye", bind: "source", offset: [0, 0.04, 0], fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 3, burst: { count: 12, interval: 20 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0, 0.012],
                    lifetime: [22, 34], size: [0.3, 0.4], sizeMode: "sin",
                    color: 0x4B2E83, alpha: [0.34, 0.08], alphaMode: "sin",
                    light: "full", maxParticles: 14
                },
                {
                    name: "watch_motes", bind: "source", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 5, burst: { count: { data: "motes", fallback: 10 }, interval: 20 }, shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.07, 0.012], sizeMode: "sin",
                    color: 0xE0A030, alpha: [0.45, 0], light: "full", maxParticles: 20
                },
                {
                    name: "watch_mist", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 3, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [24, 40], size: [0.22, 0.34],
                    color: 0x1A1226, alpha: [0.2, 0], light: "world", maxParticles: 16
                }
            ]
        },
        collect: {
            duration: 48,
            exit: { stop: 22, drain: 36 },
            emitters: [
                {
                    name: "collect_line", bind: "path", offset: [0, 0.55, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" },
                    rate: 90, direction: "shape", speed: [0.04, 0.14], trail: { minDistance: 0.08 },
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xE0A030, alpha: [0.9, 0], light: "full", maxParticles: 150
                },
                {
                    name: "collect_bite", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.08, 0.2],
                    lifetime: [9, 16], size: [0.32, 0.05], sizeMode: "index",
                    color: 0x4B2E83, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "collect_drain", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 10 }, interval: 3, repeats: 4 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.06, 0.18], drag: 0.9,
                    lifetime: [10, 18], size: [0.13, 0.02],
                    color: 0xE0A030, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "collect_smoke", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    start: 2, rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [20, 34], size: [0.26, 0.42],
                    color: 0x1A1226, alpha: [0.32, 0], light: "world", maxParticles: 30
                }
            ]
        },
        wasted: {
            duration: 28,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "wasted_line", bind: "path", offset: [0, 0.5, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    shape: { kind: "polyline" },
                    rate: 20, direction: "shape", speed: [0.02, 0.06], trail: { minDistance: 0.14 },
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0x4B2E83, alpha: [0.45, 0], light: "world", maxParticles: 30
                },
                {
                    name: "wasted_seek", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.2, 0.34],
                    color: 0x1A1226, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        lift: {
            duration: 28,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "lift_break", bind: "source", fit: "none", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.3, 0.16],
                    color: 0x4B2E83, alpha: [0.5, 0], light: "full", maxParticles: 24
                },
                {
                    name: "lift_ash", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.02, drag: 0.94,
                    lifetime: [14, 26], size: [0.06, 0.012],
                    color: 0xE0A030, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_grudge", 1, GrudgeDefinition);
