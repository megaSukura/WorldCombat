/**
 * 聚宝功 / payday 的客户端表现。
 *
 * 一句话：施法者手里掂亮一小把金币 → 一串金色硬币沿直线甩向对手，拖着一路细碎金光 →
 *   打中的那一下迸出一圈币影与金火花 → 打剩的硬币落在落点周围，闪几下金光留在场上。
 * 色相家族：金币金（0xFFD24A／0xFFEFA8）为主，近白只给命中高光；没有第二个色相。
 * 拍子：起 windup（掂币）→ 飞 throw（币串）→ 击 hit（命中迸溅）→ 落 scatter（零钱落地）。
 * 范围：自由瞄准单体招；命中与落地都发生在实际接触点/弹体结束点，不是区域招；`data.scale` 让大个子的币串更显眼。
 * 运动：币串沿发射方向直线飞行（服务端投射物），throw 时刻的发射器绑在真实弹体 id 上，与飞币同行；
 *   落地金币沿抛物线弹开。
 * 数：云端与地上的金光数量绑定 `data.coins`（速度派生的撒币数），落地闪光绑定 `data.scatter`
 *   （真正 dropItem 成功的真币数，失败不计），强度绑定 `data.intensity`（单发威力 / 40）。
 */
const PaydayDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "flip", bind: "source", offset: [0, 0.9, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 14, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.07], spin: 12,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFD24A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.95, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 6, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xFFEFA8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                }
            ]
        },
        throw: {
            duration: 60,
            exit: { stop: 50, drain: 12 },
            emitters: [
                {
                    name: "coin_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 22, shape: { kind: "sphere", radius: 0.12 },
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [5, 10], size: [0.12, 0.03],
                    color: 0xFFD24A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "coin_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    trail: { minDistance: 0.3 }, rate: { data: "coins", fallback: 6 },
                    direction: "down", speed: [0.0, 0.04], spread: 24, gravity: 0.03, drag: 0.94,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xFFEFA8, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "coins", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], spread: 24,
                    lifetime: [6, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xFFD24A, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "hit_glint", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "coins", fallback: 8 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.04, drag: 0.92,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xFFEFA8, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        scatter: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "scatter_glint", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "scatter", fallback: 4 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0xFFD24A, alpha: [0.8, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_payday", 1, PaydayDefinition);
