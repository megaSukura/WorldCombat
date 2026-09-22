/**
 * 佯攻 / feint 的客户端表现。
 *
 * 一句话：施法者压低身子、脚边碎光向前收束 → 一记虚晃贴地扑出去，拖出短促的金色风痕 → 扑到对手身上时，
 *   撑在它外面的守护先碎成一圈冷灰碎光（掀得越干净、碎光越多），随后金白的一戳真正落进去。
 * 色相家族：暖金白（0xE8D9A0 主体、0xFFF3C4 亮面、近白核心）为主体，守护碎光用中性冷灰蓝（0xAEB7C4）
 *   作破守的对照；无第二个色相。
 * 拍子：起 wind 0–14t ／ 扑 rush（逐刻续期）／ 掀 peel 0–24t ／ 中 jab ／ 空 miss。
 * 范围：peel／jab 绑目标点，半径按 `data.scale`（判定半径 / 0.5）缩放，玩家一眼看出这一戳能碰到多大。
 * 运动：wind 的碎光朝身体前方收束；rush 的风痕沿 `data.direction` 拖尾；peel 的守护碎光从目标表面向外炸。
 * 数：`data.sparks`（速度与物攻派生的碎光数）驱动 wind／rush 的发射量，`data.broken`（掀掉的守护层数）
 *   决定 peel 碎光的数量与亮度，`data.intensity`（威力 / 34）抬高命中那一下的密度。
 */
const FeintDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        wind: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 26, shape: { kind: "box", size: [0.4, 0.4, 0.4] },
                    direction: "inward", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.16, 0.04],
                    color: 0xE8D9A0, alpha: [0.6, 0], light: "full", maxParticles: 80
                },
                {
                    name: "motes", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "sparks", fallback: 12 },
                    shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.14], spin: 14,
                    lifetime: [5, 10], size: [0.08, 0.01],
                    color: 0xFFF3C4, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 50
                }
            ]
        },
        rush: {
            duration: 0,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "dashline", bind: "source", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    trail: { minDistance: 0.22 }, rate: 26,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.22, 0.07],
                    color: 0xE8D9A0, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "sparks", fallback: 12 },
                    direction: "velocity", speed: [0.05, 0.18], spin: 16,
                    lifetime: [5, 10], size: [0.07, 0.01],
                    color: 0xFFF3C4, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        peel: {
            duration: 24,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "guard_shatter", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/screen",
                    burst: { count: { data: "broken", fallback: 1 }, interval: 2 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.12, 0.3], spin: 24,
                    lifetime: [10, 18], size: [0.34, 0.6], sizeMode: "index",
                    color: 0xAEB7C4, alpha: [0.7, 0], light: "world", maxParticles: 24
                },
                {
                    name: "peel_shards", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "broken", fallback: 1 } },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.12, 0.34],
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xDCE6F2, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 40
                },
                {
                    name: "stab", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 14, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [6, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFF3C4, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 40
                }
            ]
        },
        jab: {
            duration: 20,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "stab", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "sparks", fallback: 12 }, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.28],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE8D9A0, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 11 },
            emitters: [
                {
                    name: "whiff", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparks", fallback: 10 }, at: 0 }, shape: { kind: "circle", radius: 0.6 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xB7AE93, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_feint", 1, FeintDefinition);
