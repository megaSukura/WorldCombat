/**
 * 回旋踢 / rollingkick 的客户端表现。
 *
 * 一句话：施法者原地急旋，脚边卷起一圈橙黄火星；随后扑出半步，回旋腿正中目标炸开一记格斗冲击，
 * 被踢中的人沿踢击方向拖着一串火花抛到半空飞出去。
 * 色相家族：橙黄与暖白（impact_fighting / critical_hit 为主体，0xE8A96A），近白只给踢中的那一闪。
 * 拍子：起（whirl 急旋，火星绕脚边转）→ 扑（drive 扑出）→ 中（kick 命中冲击）→ 飞（launch 目标抛飞）→ 懵（flinch）／空（miss）。
 * 范围：这一招只作用在贴身一个目标身上；whirl 的环按服务端传的 `data.radius`（扑击距离）画出，玩家看得出踢腿能及的范围。
 * 运动：起旋时火星绕脚边环转，扑出时向前拖尾；命中后目标那一串火星沿 `data.direction` 斜向上飞出，画出抛飞的弧线。
 * 数：`data.sparks`（速度与物攻派生）决定起旋与命中的火星量，`data.sparkles`（抛飞距离派生）决定抛飞轨迹的密度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const RollingkickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        whirl: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "whirl_ring", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 26, shape: { kind: "ring", radius: 0.7 }, direction: "shape", speed: [0.03, 0.12], spin: 24,
                    lifetime: [8, 15], size: [0.12, 0.02],
                    color: 0xE8A96A, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "whirl_dust", bind: "source", offset: [0, 0.03, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "circle", radius: 0.8, thickness: 0.85 },
                    direction: "outward", speed: [0.05, 0.2], spread: 12, gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xD8C0A0, alpha: [0.4, 0], light: "world", maxParticles: 44
                }
            ]
        },
        drive: {
            duration: 16,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "drive_streak", bind: "source", offset: [0, 0.5, 0], height: 0.5, fit: "body",
                    trail: { minDistance: 0.16 },
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 26, shape: { kind: "sphere", radius: 0.18 }, direction: "outward", speed: [0.02, 0.1], spread: 12,
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0xE8A96A, alpha: [0.6, 0], light: "full", maxParticles: 70
                }
            ]
        },
        kick: {
            duration: 22,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "kick_burst", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: { data: "sparks", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.12, 0.5], spread: 24,
                    lifetime: [7, 13], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "kick_crit", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/vanilla/critical_hit",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.1, 0.35], spread: 20,
                    lifetime: [6, 10], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xE8A96A, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 12
                }
            ]
        },
        launch: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "launch_arc", bind: "target", offset: [0, 0.1, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "sparkles", fallback: 12 },
                    shape: { kind: "point" }, direction: [0, 1, 0], speed: [0.25, 0.7], spread: 16,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xE8A96A, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "launch_dust", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "circle", radius: 0.5, thickness: 0.7 }, direction: "outward", speed: [0.05, 0.2], spread: 14,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0xD8C0A0, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        flinch: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "daze", bind: "target", offset: [0, 0, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.02, 0.1], spread: 20,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xFFE8C0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "miss_spark", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.04, 0.16], spread: 16,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.01],
                    color: 0xD8C0A0, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rollingkick", 1, RollingkickDefinition);
