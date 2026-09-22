/**
 * 猛推 / armthrust 的客户端表现。
 *
 * 一句话：施法者摊开双手、掌缘亮起拳气，随后一掌接一掌把对手朝前推出去；被顶到墙上的那一刻，墙上绽开一记
 *   更大的撞墙爆点与四散的尘屑。
 * 色相家族：拳气暖褐（0xE0A46A 偏色）与命中近白（0xFFFFFF）做本体与强调，掌风与撞墙碎屑（tinydust／earth 原色）做余韵。
 * 拍子：起 brace（张手亮掌）→ 推 thrust（一掌掌推出去）→ 中 hit / 撞 slam / 空 out → 收 settle。
 * 范围：本招是身前一条推撞走廊（长 `data.reach`），画面用沿 `data.direction` 的掌风带标出「这条线上会被推」。
 * 运动：`palm` 从施法者沿 `data.direction` 推出（`orient: "direction"`），命中处向外崩掌风；撞墙幕在目标点炸开一个更大的环。
 * 数：`data.knuckles`（物攻换算的掌风量）绑定每一推与命中的发射量，`data.index` / `data.thrusts` 让画面读出演到第几推、
 *   还剩几推，`data.intensity`（单推威力派生，撞墙幕 ×1.2）抬高亮度，`data.scale`（臂展换算）让大个子的掌风更大。
 */
const ArmthrustDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 3, drain: 9 },
            emitters: [
                {
                    name: "open", bind: "source", offset: [0, 0.5, -0.3], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    rate: 18, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.11],
                    lifetime: [6, 11], size: [0.3, 0.08],
                    color: 0xE0A46A, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "brace", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "circle", radius: 0.48 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.05, drag: 0.92,
                    lifetime: [7, 12], size: [0.06, 0.02],
                    alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        thrust: {
            duration: 12,
            exit: { drain: 8 },
            emitters: [
                {
                    name: "palm", bind: "source", offset: [0, 0.5, -0.15], height: 0.45, fit: "body",
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/softswipe",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "line", length: { data: "reach", fallback: 2.5 } }, direction: "shape", speed: [0.4, 1.1], spread: 6,
                    lifetime: [5, 9], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "force", bind: "source", offset: [0, 0.4, -0.1], height: 0.4, fit: "body",
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "knuckles", fallback: 14 }, at: 0 },
                    shape: { kind: "line", length: { data: "reach", fallback: 2.5 } }, direction: "shape", speed: [0.1, 0.35], spread: 14, drag: 0.9,
                    lifetime: [6, 12], size: [0.06, 0.02],
                    color: 0xE0A46A, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.45, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.13],
                    lifetime: [6, 11], size: [0.4, 0.09],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 16
                },
                {
                    name: "chaff", bind: "target", offset: [0, 0.4, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "knuckles", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.3], spread: 26, gravity: 0.07, drag: 0.9,
                    lifetime: [8, 14], size: [0.07, 0.02],
                    color: 0xE0A46A, alpha: [0.45, 0], light: "world", maxParticles: 90
                }
            ]
        },
        slam: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "crash", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [7, 13], size: [0.55, 0.12],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 18
                },
                {
                    name: "shock", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.8, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.22], drag: 0.9,
                    lifetime: [7, 13], size: [0.3, 0.07],
                    color: 0xFFFFFF, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 20
                },
                {
                    name: "debris", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "knuckles", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.3], spread: 28, gravity: 0.1, drag: 0.9,
                    lifetime: [9, 16], size: [0.12, 0.03],
                    color: 0xB08C5A, alpha: [0.8, 0], light: "world", maxParticles: 90
                }
            ]
        },
        out: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "empty", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "knuckles", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.14], drag: 0.9,
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0xE0A46A, alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        settle: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "rest", bind: "source", offset: [0, 0.5, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.9, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [7, 12], size: [0.16, 0.05],
                    color: 0xE0A46A, alpha: [0.3, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_armthrust", 1, ArmthrustDefinition);
