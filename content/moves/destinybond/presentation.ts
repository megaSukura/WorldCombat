/**
 * 同命 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者当众把一条红线系在自己身上（线头一圈圈缠上来）；一旦有人亲手把它打倒，
 *   线从它的位置猛地绷向凶手，把凶手也一起拖下去；线若没派上用场，就松开、垂落、散掉。
 *
 * 色相家族：深玫红（0xC2354B）为主体，近黑（0x2A0A10）做底与烟，浅粉（0xF2A9B8）只做高光小点；
 *   两端共用的心形贴图（fadeheart_white）是这条命线的记号。
 * 层次：缠线（起手，源侧）／守约（持续，源侧）／绷断（命中，两端同时）／松开（收）。
 * 起击收：bind（缠线）→ promise（守约）→ drag（绷断）→ lift（松开）。
 * 数：线头量绑 data.threads（特攻派生），绳结圈半径绑 data.scale（实际半径 / 0.4），
 *   持续亮度随 data.surge（剩余比例）变化；绷断时用 data.path（倒下点 ↔ 凶手）画一条 polyline，
 *   谁把线绷紧、线牵到谁身上，一眼可见。
 */
const DestinyBondDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        bind: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "bind_threads", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 20, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08], spin: 10,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xC2354B, alpha: [0.75, 0], light: "full", maxParticles: 40
                },
                {
                    name: "bind_hearts", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    rate: 8, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0xF2A9B8, alpha: [0.8, 0], light: "full", maxParticles: 22
                }
            ]
        },
        promise: {
            exit: { drain: 40 },
            emitters: [
                {
                    name: "promise_ring", bind: "source", offset: [0, 0.04, 0], fit: "none", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 3, burst: { count: 12, interval: 20 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0, 0.012],
                    lifetime: [22, 34], size: [0.3, 0.4], sizeMode: "sin",
                    color: 0xC2354B, alpha: [0.34, 0.08], alphaMode: "sin",
                    light: "full", maxParticles: 14
                },
                {
                    name: "promise_threads", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 6, burst: { count: { data: "threads", fallback: 8 }, interval: 20 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.01, 0.04], spin: 8,
                    lifetime: [16, 26], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xC2354B, alpha: [0.5, 0], light: "full", maxParticles: 22
                },
                {
                    name: "promise_heart", bind: "source", offset: [0, 1.14, 0], height: 0.24,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    rate: 1, burst: { count: 2, interval: 20 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [24, 36], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xF2A9B8, alpha: [0.4, 0.05], alphaMode: "sin",
                    light: "full", maxParticles: 6
                }
            ]
        },
        drag: {
            duration: 48,
            exit: { stop: 22, drain: 36 },
            emitters: [
                {
                    name: "drag_line", bind: "path", offset: [0, 0.7, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    shape: { kind: "polyline" },
                    rate: 90, direction: "shape", speed: [0.03, 0.12], trail: { minDistance: 0.08 },
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0xC2354B, alpha: [0.9, 0], light: "full", maxParticles: 160
                },
                {
                    name: "drag_snap", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.28],
                    lifetime: [8, 15], size: [0.34, 0.04], sizeMode: "index",
                    color: 0xC2354B, alpha: [1, 0], light: "full", bloom: 0.35
                },
                {
                    name: "drag_claim", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 14, at: 2 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [9, 16], size: [0.34, 0.05], sizeMode: "index",
                    color: 0x2A0A10, alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "drag_heart", bind: "target", offset: [0, 1.0, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 6, at: 2 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.03, drag: 0.9,
                    lifetime: [16, 28], size: [0.18, 0.03],
                    color: 0xF2A9B8, alpha: [0.85, 0], light: "full", maxParticles: 12
                },
                {
                    name: "drag_smoke", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    start: 2, rate: 10, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [20, 34], size: [0.26, 0.42],
                    color: 0x2A0A10, alpha: [0.3, 0], light: "world", maxParticles: 30
                }
            ]
        },
        lift: {
            duration: 30,
            exit: { stop: 12, drain: 24 },
            emitters: [
                {
                    name: "lift_loose", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.12],
                    lifetime: [12, 20], size: [0.3, 0.16],
                    color: 0xC2354B, alpha: [0.5, 0], light: "full", maxParticles: 26
                },
                {
                    name: "lift_fall", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.02, drag: 0.93,
                    lifetime: [14, 26], size: [0.12, 0.02],
                    color: 0x8A2436, alpha: [0.6, 0], light: "world", maxParticles: 24
                },
                {
                    name: "lift_hearts", bind: "source", offset: [0, 1.0, 0], height: 0.26,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.95,
                    lifetime: [16, 28], size: [0.14, 0.02],
                    color: 0xF2A9B8, alpha: [0.5, 0], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_destinybond", 1, DestinyBondDefinition);
