/**
 * 太晶爆发 / terablast —— 客户端表现。
 *
 * 一句话：身前聚起一圈近白晶体、亮核跳一下 → 物攻更高的人投出一支厚重晶矛（完整矛影 + 冰晶拖尾，
 * 撞上第一个目标炸成一地碎晶并把目标顶开，撞墙则晶光熄灭）→ 特攻更高的人放出一条固定方向的窄晶束，
 * 线头逐段向前铺、遇到方块停在墙面，线内命中处起一次冲击。
 * 色相家族：近白晶体（0xFFFFFF / 0xEAF2FF）为主体，亮核与命中环按 data.type 走共享 type 色表（缺省青白）。
 * 数：命中强弱由服务端算出的 `bursts`（伤害占目标最大生命的比例）决定碎晶数量；晶矛粗细由 `scale`（判定半径换算）；
 *   晶束粗细由 `scale`（线宽换算），线形与服务端 WorldGeometry.lane 用同一组端点。
 * 拍子：起（windup）／行（ram 或 beam）／击（impact 或 beam_impact）／空（fizzle）。
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
            duration: 80,
            exit: { stop: 60, drain: 24 },
            emitters: [
                {
                    name: "spear_body", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 60, shape: { kind: "sphere", radius: 0.20 },
                    direction: "shape", speed: [0.0, 0.03], spin: 10,
                    lifetime: [6, 14], size: [0.24, 0.05],
                    color: 0xD6ECFF, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
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
            duration: 0,
            exit: { stop: 0, drain: 16 },
            emitters: [
                {
                    name: "beam_spine", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    shape: { kind: "polyline" },
                    rate: 90, direction: "shape", speed: [0.0, 0.02],
                    lifetime: [5, 10], size: [0.18, 0.06], sizeMode: "index",
                    color: TypeColors.binding("type", 0xA9D6FF), alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 160
                },
                {
                    name: "beam_spark", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" },
                    rate: 60, direction: "shape", speed: [0.02, 0.06],
                    lifetime: [5, 12], size: [0.06, 0.01],
                    color: 0xEAF6FF, alpha: [0.85, 0], light: "full", maxParticles: 160
                },
                {
                    name: "beam_tip", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 24, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.24, 0.04],
                    color: TypeColors.binding("type", 0xEAF6FF), alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 16
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
        beam_impact: {
            duration: 34,
            exit: { stop: 8, drain: 28 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "bursts", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.30], gravity: 0.02, spin: 12,
                    lifetime: [10, 22], size: [0.22, 0.03],
                    color: 0xD6ECFF, alpha: [1, 0], light: "full", maxParticles: 120
                },
                {
                    name: "flash", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 10, size: [0.42, 0.06], sizeMode: "index",
                    color: TypeColors.binding("type", 0xFFFFFF), alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 6
                },
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: { data: "cover", fallback: 1.1 } },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 18], size: [0.5, 0.2],
                    color: TypeColors.binding("type", 0xEAF6FF), alpha: [0.7, 0], light: "full", maxParticles: 4
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.1, 0],
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
