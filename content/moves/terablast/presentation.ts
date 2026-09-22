/**
 * 太晶爆发 / terablast —— 客户端表现。
 *
 * 一句话：身前聚起一圈近白晶体、亮核跳一下 → 物攻更高的人化身晶冲（冰晶碎片拖尾撞出），
 * 特攻更高的人放出晶束（青色光核直线飞出）→ 命中处炸成一地碎晶并把目标顶开 → 撞墙时晶光熄灭。
 * 色相家族：近白晶体（0xFFFFFF / 0xEAF2FF）为主体，亮核与命中环按 data.type 走共享 type 色表（缺省青白），碎屑留中性尘。
 * 命中强弱由服务端算出的 `bursts`（伤害占目标最大生命的比例）决定碎晶数量。
 * 拍子：起（windup）／行（ram 或 beam）／击（impact）／空（fizzle）。
 */
const TeraBlastDefinition: ParticleDefinition = {
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 16], size: [0.16, 0.02],
                    color: TypeColors.binding("type", 0xEAF2FF), alpha: [0.9, 0], light: "full", maxParticles: 24
                },
                {
                    name: "facets", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 14, shape: { kind: "sphere", radius: 0.9 },
                    direction: "inward", speed: [0.04, 0.10], spin: 6,
                    lifetime: [10, 20], size: [0.20, 0.03],
                    color: 0xC7E6FF, alpha: [0.85, 0], light: "full", maxParticles: 40
                },
                {
                    name: "motes", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        ram: {
            duration: 60,
            exit: { stop: 50, drain: 20 },
            emitters: [
                {
                    name: "shard_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 40, shape: { kind: "sphere", radius: 0.18 },
                    direction: "away", speed: [0.02, 0.08], spin: 9,
                    lifetime: [6, 14], size: [0.14, 0.02],
                    color: 0xC7E6FF, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "shard_dust", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 40, shape: { kind: "sphere", radius: 0.12 },
                    direction: "away", speed: [0.01, 0.05],
                    lifetime: [5, 12], size: [0.05, 0.01],
                    color: 0xE6F2FF, alpha: [0.6, 0], light: "full", maxParticles: 80
                }
            ]
        },
        beam: {
            duration: 60,
            exit: { stop: 50, drain: 20 },
            emitters: [
                {
                    name: "beam_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 60, shape: { kind: "sphere", radius: 0.16 },
                    direction: "shape", speed: [0.0, 0.02],
                    lifetime: [4, 10], size: [0.20, 0.04],
                    color: TypeColors.binding("type", 0xA9D6FF), alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "beam_spark", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 50, shape: { kind: "sphere", radius: 0.14 },
                    direction: "away", speed: [0.03, 0.10],
                    lifetime: [5, 12], size: [0.06, 0.01],
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", maxParticles: 80
                }
            ]
        },
        impact: {
            duration: 34,
            exit: { stop: 8, drain: 28 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "bursts", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.30], gravity: 0.02, spin: 12,
                    lifetime: [10, 22], size: [0.22, 0.03],
                    color: 0xD6ECFF, alpha: [1, 0], light: "full", maxParticles: 120
                },
                {
                    name: "flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 10, size: [0.42, 0.06], sizeMode: "index",
                    color: TypeColors.binding("type", 0xFFFFFF), alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "cover", fallback: 1.1 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 18], size: [0.5, 0.2],
                    color: TypeColors.binding("type", 0xEAF6FF), alpha: [0.7, 0], light: "full", maxParticles: 4
                },
                {
                    name: "dust", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "bursts", fallback: 10 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.14], gravity: 0.015,
                    lifetime: [12, 24], size: [0.05, 0.01],
                    color: 0xF0F6FF, alpha: [0.6, 0], light: "full", maxParticles: 120
                }
            ]
        },
        fizzle: {
            duration: 24,
            exit: { stop: 6, drain: 20 },
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 26 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.12], gravity: 0.02,
                    lifetime: [8, 18], size: [0.07, 0.01],
                    color: 0xBFD4E6, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "fizzle_smoke", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.25 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [14, 24], size: [0.22, 0.05],
                    color: 0xDCE6F0, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:move_terablast", 1, TeraBlastDefinition);
