/**
 * 尖石攻击 / stoneedge 的客户端表现。
 *
 * 一句话：脚下先裂开一道缝、土尘沿缝朝目标窜出去 → 石刺在缝上一段段顶起、崩落碎石 → 站在脊带里的人被从下方
 *   刺中、溅起岩屑与冷白火花 → 没刺到就只剩一道朝外散开的尘环。
 * 色相家族：石灰（0x9A8F82 主体、0xC9C2B6 亮面、0x5C554E 只做暗部）＋冷白高光（0xF4F1EA）只出现在刺尖与命中。
 * 拍子：起 sunder（裂土）→ 裂 spike（每段一道填满的脊带，叠成推进的裂缝）→ 刺 pierce（扎中）→ 收 miss（空裂）。
 * 范围：spike 用与判定同一组 `data.path` 顶点填出脊带（服务端 WorldGeometry.lane 的同一块地），站在脊带里就是会被刺到。
 * 运动：脊带随 `data.index`／`data.segments` 一段段朝 `data.direction` 推进，刺尖永远朝上顶。
 * 数：碎石量绑定 `data.dust`（物攻与体重换算），段数绑定 `data.segments`（等级换算），尺度绑定 `data.scale`（裂线长度换算），
 *   亮度绑定 `data.intensity`（石刺威力换算）。
 */
const StoneEdgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        sunder: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "crack", bind: "source", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 30, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.03, 0.14], spread: 12,
                    lifetime: [8, 15], size: [0.16, 0.03],
                    color: 0x9A8F82, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.02, drag: 0.94,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0x5C554E, alpha: [0.55, 0], light: "world", maxParticles: 60
                }
            ]
        },
        spike: {
            duration: 14,
            exit: { stop: 10, drain: 10 },
            emitters: [
                {
                    name: "ridge", bind: "path", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/earth",
                    shape: { kind: "polygon" },
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    direction: "up", speed: [0.04, 0.16], spread: 24,
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.14, 0.03],
                    color: 0x7C7268, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "tips", bind: "path", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    shape: { kind: "polyline" },
                    rate: 70, direction: "up", speed: [0.05, 0.22], spread: 14,
                    lifetime: [7, 13], size: [0.2, 0.05],
                    color: 0xC9C2B6, alpha: [0.85, 0], light: "world", maxParticles: 130
                },
                {
                    name: "shards", bind: "path", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    direction: "up", speed: [0.08, 0.3], spread: 30, spin: 12,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [12, 22], size: [0.18, 0.04], sizeMode: "index",
                    color: 0x9A8F82, alpha: [0.9, 0], light: "world", maxParticles: 120
                },
                {
                    name: "seam", bind: "path", fit: "none", offset: [0, 0.14, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "polyline" },
                    rate: 16, direction: "up", speed: [0.02, 0.08],
                    lifetime: [6, 11], size: [0.06, 0.01],
                    color: 0xF4F1EA, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        pierce: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "stab", bind: "target", offset: [0, 0.15, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26,
                    lifetime: [7, 13], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xC9C2B6, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 80
                },
                {
                    name: "chips", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "up", speed: [0.08, 0.28], spread: 30, spin: 14,
                    gravity: 0.08, drag: 0.9,
                    lifetime: [12, 22], size: [0.2, 0.04],
                    color: 0x9A8F82, alpha: [0.9, 0], light: "world", maxParticles: 90
                },
                {
                    name: "flash", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "dust", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [7, 12], size: [0.07, 0.01],
                    color: 0xF4F1EA, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 50
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 13 },
            emitters: [
                {
                    name: "scuff", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "outward", speed: [0.05, 0.2], spread: 16,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 17], size: [0.07, 0.02],
                    color: 0x7C7268, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stoneedge", 1, StoneEdgeDefinition);
