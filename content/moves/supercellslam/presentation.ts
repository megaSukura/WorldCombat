/**
 * 闪电强袭 / supercellslam 的客户端表现。
 *
 * 一句话：施法者周身电花越聚越密，带电腾空后沿一道电柱压向对手，落点炸开电系冲击与一层电火花；
 * 落空则是带电身体砸地、电光四散。
 * 色相家族：电黄（0xFFE463）与近白（0xFFFFFF）为主体，落尘用中性 tinydust 作底。
 * 拍子：起 windup（聚电）→ 腾 leap（电柱爬升）→ 坠 dive（带电冲刺）→ 击 impact ／ 失 crash。
 * 范围：dive 的 `bind:"path"` 从当前位置连到锁定落点，画的就是这一压覆盖到的直线；impact 的电环按
 *   `data.hitRadius`（放电半径）铺开。
 * 运动：leap 是绕身旋转的电花与向上电柱，dive 是沿 `data.direction` 的电光冲刺，impact 是向外崩开的电环。
 * 数：`data.chargeRate`（蓄电等级 + 实际爬升高度派生）决定 leap 电柱密度，`data.count`（强袭威力派生）决定命中迸发量，
 *   `data.sparks` 决定放电电花数量，`data.dust` 决定扬尘密度，`data.intensity` 抬高亮度，
 *   `data.scale`（放电半径 / 0.7）放大电环。
 */
const SupercellslamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "charge", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "charge", fallback: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.14], spread: 8,
                    lifetime: [6, 12], size: [0.18, 0.04],
                    color: 0xFFE463, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "lift", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.03],
                    color: 0xFFF6C8, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        leap: {
            duration: 24,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "column", bind: "source", height: 0.1, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "chargeRate", fallback: 18 }, shape: { kind: "box", size: [0.3, 0.32, 0.3] },
                    direction: "shape", speed: [0.03, 0.14], trail: { minDistance: 0.24 },
                    lifetime: [5, 10], size: [0.18, 0.05],
                    color: 0xFFFFFF, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 140
                },
                {
                    name: "orbit", bind: "source", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 16, shape: { kind: "torus", radius: 0.42, thickness: 0.1, rotation: [90, 0, 0] },
                    direction: "shape", speed: [0.04, 0.16],
                    lifetime: [7, 12], size: [0.12, 0.03],
                    color: 0xFFE463, alpha: [0.7, 0], light: "full", maxParticles: 80
                }
            ]
        },
        dive: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "trail", bind: "path", offset: [0, 0.12, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    shape: { kind: "polyline" },
                    rate: 30, speed: [0.02, 0.1], spread: 14,
                    lifetime: [5, 10], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xFFE463, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 100
                },
                {
                    name: "rush", bind: "source", height: 0.4, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 28, shape: { kind: "box", size: [0.3, 0.26, 0.3] },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.2 },
                    lifetime: [5, 9], size: [0.17, 0.05],
                    color: 0xFFF6C8, alpha: [0.7, 0], light: "full", maxParticles: 100
                }
            ]
        },
        impact: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "count", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.09, 0.32], spread: 16,
                    lifetime: [7, 13], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFF6C8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "arcs", bind: "target", height: 0.5, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "sparks", fallback: 18 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "hitRadius", fallback: 0.7 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.26], spread: 20,
                    lifetime: [6, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFE463, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 14 }, at: 1 },
                    shape: { kind: "ring", radius: 0.46 },
                    direction: "outward", speed: [0.07, 0.2], spread: 12,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [10, 17], size: [0.07, 0.01], sizeMode: "index",
                    color: 0x9A8A6B, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        crash: {
            duration: 28,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "thud", bind: "source", height: 0.05, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "dust", fallback: 14 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.07, 0.22], spread: 14,
                    lifetime: [9, 15], size: [0.42, 0.1], sizeMode: "index",
                    color: 0xC8B890, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "short", bind: "source", height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "sparks", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.46 },
                    direction: "outward", speed: [0.08, 0.26], spread: 22,
                    lifetime: [6, 12], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xFFE463, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_supercellslam", 1, SupercellslamDefinition);
