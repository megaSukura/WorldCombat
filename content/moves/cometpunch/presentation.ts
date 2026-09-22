/**
 * 连续拳 / cometpunch 的客户端表现。
 *
 * 一句话：施法者沉肩收拳、拳面亮起白光，随后双拳一下接一下朝身前砸出去，拳影叠成一片暖白的怒涛；
 *   每一下砸实都在对手身上炸开一小簇拳风与星点，没砸到就只剩一道擦空的拳影。
 * 色相家族：拳白偏暖（0xFFE08A 偏色）与命中近白（0xFFFFFF）做本体与强调，拳风碎屑（tinydust 原色）只做余韵。
 * 拍子：起 brace（收拳亮面）→ 击 flurry（一拳接一拳）→ 中 hit / 空 miss → 收 settle。
 * 范围：本招是身前一点（聚焦式）或一小片扇面（乱打式）的连拳，画面靠砸在对手身上的拳印与拳风标出会被打到的地方。
 * 运动：`fist` 从施法者朝目标锚点直线砸出（`orient: "toward"`），拳影沿 `data.direction` 微微散开（乱打式）；
 *   命中处向外崩拳风。
 * 数：`data.sparks`（物攻换算的拳风量）绑定命中星点与碎屑的发射量，`data.index` / `data.punches` 让画面读出
 *   演到第几拳、还剩几拳，`data.intensity`（单拳威力派生）抬高亮度，`data.scale`（臂展换算）让大个子的拳更大。
 */
const CometpunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: { data: "windup", fallback: 5 },
            exit: { stop: 3, drain: 9 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.5, -0.3], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/hollowfist",
                    rate: 16, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 11], size: [0.22, 0.06],
                    color: 0xFFE08A, alpha: [0.75, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "heat", bind: "source", offset: [0, 0.5, -0.28], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [5, 10], size: [0.1, 0.03],
                    color: 0xFFE08A, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        flurry: {
            duration: 10,
            exit: { drain: 7 },
            emitters: [
                {
                    name: "fist", bind: "source", offset: [0, 0.5, -0.2], height: 0.45, fit: "body",
                    orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/fist",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.16 }, direction: "toward", speed: [0.55, 1.35], spread: 5,
                    lifetime: [4, 8], size: [0.34, 0.08], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "after", bind: "source", offset: [0, 0.5, -0.2], height: 0.45, fit: "body",
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 4, at: 0 },
                    shape: { kind: "line", length: 0.2 }, direction: "shape", speed: [0.2, 0.6], spread: 12,
                    lifetime: [3, 6], size: [0.14, 0.03],
                    color: 0xFFE08A, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.45, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.13],
                    lifetime: [6, 11], size: [0.4, 0.09],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 16
                },
                {
                    name: "star", bind: "target", offset: [0, 0.45, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.32], spread: 30, drag: 0.9,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xFFE08A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 100
                },
                {
                    name: "wind", bind: "target", offset: [0, 0.4, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.28], spread: 26, gravity: 0.06, drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    alpha: [0.4, 0], light: "world", maxParticles: 100
                }
            ]
        },
        miss: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "whiff", bind: "target", offset: [0, 0.45, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 10 }, at: 0 },
                    shape: { kind: "line", length: 0.6 }, direction: "outward", speed: [0.04, 0.16], spread: 20, drag: 0.9,
                    lifetime: [6, 11], size: [0.06, 0.02],
                    alpha: [0.3, 0], light: "world", maxParticles: 60
                }
            ]
        },
        settle: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "rest", bind: "source", offset: [0, 0.5, 0], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.8, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [7, 12], size: [0.2, 0.05],
                    color: 0xFFE08A, alpha: [0.3, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_cometpunch", 1, CometpunchDefinition);
