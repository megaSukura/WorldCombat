/**
 * 投球 / barrage 的客户端表现。
 *
 * 一句话：施法者把圆球拢在手边转出一点弧光，随后一个接一个抛出去，球拖着一条暖色细尾飞向目标，命中处像球破开
 *   一样炸开一小圈彩屑；平投的球撞上墙会先弹一下再落地，落地只剩一撮尘。
 * 色相家族：球身暖黄（0xE8C86A 偏色）与命中近白（0xFFFFFF）做本体与强调，彩屑与落尘（confetti／tinydust 原色）做余韵。
 * 拍子：起 gather（拢球转弧）→ 投 throw（一球接一球）→ 中 hit ／ 弹 bounce ／ 落 land → 收 settle。
 * 范围：本招是远程单体连投，画面靠每个球的轨迹标出「这条抛物线附近会被砸到」，没有地面轮廓。
 * 运动：`ball` 绑投射物本体（`bind: "projectile"`），沿服务端算出的直线或弧线飞（高抛式弧更陡），身后留一条细尾；
 *   命中点向外崩彩屑，弹墙幕沿墙面炸开一个小环。
 * 数：`data.chips`（物攻换算的球屑量）绑定命中与落地的发射量，`data.index` / `data.throws` 让画面读出演到第几球、
 *   还剩几球，`data.intensity`（单球威力派生）抬高亮度，`data.scale`（球判定换算）让大个子的球更大。
 */
const BarrageDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "hand", bind: "source", offset: [0, 0.5, -0.3], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 20, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12], spin: 5,
                    lifetime: [7, 13], size: [0.14, 0.04],
                    color: 0xE8C86A, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 46
                },
                {
                    name: "arc", bind: "source", offset: [0, 0.5, -0.3], height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 34
                }
            ]
        },
        throw: {
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "ball", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    trail: { minDistance: 0.2 }, rate: 30, spin: 10,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.15, 0.05],
                    color: 0xE8C86A, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    trail: { minDistance: 0.28 }, rate: 14,
                    direction: "velocity", speed: [0.02, 0.08], spread: 22, gravity: 0.03, drag: 0.94,
                    lifetime: [5, 10], size: [0.07, 0.02],
                    color: 0xFFFFFF, alpha: [0.55, 0], light: "full", bloom: 0.2, maxParticles: 36
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [6, 11], size: [0.42, 0.09],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 16
                },
                {
                    name: "confetti", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "chips", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.32], spread: 30, spin: 9, gravity: 0.08, drag: 0.9,
                    lifetime: [9, 16], size: [0.14, 0.03],
                    color: 0xE8C86A, alpha: [0.9, 0], light: "world", maxParticles: 100
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.02],
                    alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        bounce: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "ricochet", bind: "point", fit: "none", offset: [0, 0.3, 0],
                    particle: "world_combat_core:cobblemon/generic/pop",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [5, 10], size: [0.26, 0.06],
                    color: 0xE8C86A, alpha: [0.9, 0], light: "full", maxParticles: 12
                },
                {
                    name: "puff", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.06, drag: 0.9,
                    lifetime: [6, 11], size: [0.05, 0.02],
                    alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        land: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "settle", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "chips", fallback: 8 }, at: 0 },
                    shape: { kind: "circle", radius: 0.42 },
                    direction: "outward", speed: [0.03, 0.13], gravity: 0.06, drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xB9A97E, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        },
        settle: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "rest", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.9, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [7, 12], size: [0.16, 0.05],
                    color: 0xE8C86A, alpha: [0.3, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_barrage", 1, BarrageDefinition);
