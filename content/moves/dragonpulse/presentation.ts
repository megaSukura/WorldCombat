/**
 * 龙之波动 / dragonpulse 的客户端表现。
 *
 * 一句话：张口把龙息压成一圈圈青紫的同心波面，从嘴前一圈接一圈沿直线推出去，扫过的目标身上炸开龙属冲击，
 * 尽头留下一缕散去的余波。
 * 色相家族：龙青（0x7FE6D0）为主体、紫（0x9A6BE0）作波面内芯，强调用原型 impact_dragon。
 * 拍子：起（charge 聚气）→ 推（release 脱手、pulse 沿途推进、impact 逐个命中）→ 链（chain 同线连穿、后续 impact 按衰减反复）→ 收（fade 散去）。
 * 范围：pulse 绑 projectile，波面沿直线推进，线两侧由 `data.scale`（波面厚度 / 0.42）决定展开；chain 整条线读 `data.path`、线宽读 `data.scale`（连锁线宽 / 0.6）。
 * 运动：波面逐圈向外鼓、沿轴前进；推进速度由服务端决定，画面跟着弹体走。
 * 数：`data.flow`（波面道数换算的流量）绑定 pulse 的发射率，`data.rings` 决定同屏几道波环，
 * `data.intensity`（本击威力 / 76）抬高命中亮度，命中个数写进 `data.hits`。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const DragonpulseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.65, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 20, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.18, 0.05], spin: 6,
                    color: 0x7FE6D0, alpha: [0.4, 0], light: "world", maxParticles: 90
                },
                {
                    name: "focus", bind: "source", offset: [0, 0.65, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 12, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xB79AF0, alpha: [0.6, 0], light: "full", maxParticles: 44
                }
            ]
        },
        release: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "mouth_ring", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.28, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.24, 0.5],
                    color: 0x7FE6D0, alpha: [0.7, 0], light: "full", maxParticles: 12
                },
                {
                    name: "spray", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "flow", fallback: 90 } },
                    shape: { kind: "cone", radius: 0.36, angleDegrees: 22 },
                    direction: "shape", speed: [0.1, 0.3], spread: 10,
                    lifetime: [5, 11], size: [0.12, 0.03],
                    color: 0xA6F3E2, alpha: [0.85, 0], light: "full", maxParticles: 120
                }
            ]
        },
        pulse: {
            duration: 70,
            exit: { stop: 48, drain: 20 },
            emitters: [
                {
                    name: "wave", bind: "projectile", orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    shape: { kind: "ring", radius: 0.36 },
                    rate: { data: "flow", fallback: 90 }, amount: { data: "rings", fallback: 3 },
                    direction: "shape", speed: [0.04, 0.14],
                    lifetime: [7, 14], size: [0.3, 0.62], sizeMode: "sin", spin: 4,
                    color: 0x7FE6D0, alpha: [0.4, 0], light: "world", maxParticles: 260
                },
                {
                    name: "core", bind: "projectile", orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    trail: { minDistance: 0.28 },
                    rate: { data: "flow", fallback: 90 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [6, 12], size: [0.14, 0.04],
                    color: 0xB79AF0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 220
                }
            ]
        },
        impact: {
            duration: 24,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.06, 0.22],
                    lifetime: [6, 11], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xD8FBF0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "motes", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.22],
                    lifetime: [8, 16], size: [0.13, 0.04],
                    color: 0xA6F3E2, alpha: [0.85, 0], light: "full", maxParticles: 90
                }
            ]
        },
        chain: {
            duration: 28,
            exit: { stop: 13, drain: 18 },
            emitters: [
                {
                    name: "rail", bind: "path", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    shape: { kind: "polyline" },
                    rate: { data: "flow", fallback: 90 }, amount: { data: "rings", fallback: 3 },
                    direction: "shape", speed: [0.04, 0.14],
                    lifetime: [7, 14], size: [0.3, 0.6], sizeMode: "sin",
                    color: 0x7FE6D0, alpha: [0.45, 0], light: "world", maxParticles: 160
                },
                {
                    name: "chain_core", bind: "path", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "flow", fallback: 60 } },
                    direction: "shape", speed: [0.05, 0.18], spread: 10,
                    lifetime: [6, 12], size: [0.13, 0.04],
                    color: 0xB79AF0, alpha: [0.75, 0], light: "full", maxParticles: 140
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "mist", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18 },
                    shape: { kind: "hemisphere", radius: 0.45 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 26], size: [0.3, 0.1],
                    color: 0x7FB6A8, alpha: [0.22, 0], light: "world", maxParticles: 60
                },
                {
                    name: "residual", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.14],
                    gravity: 0.02, drag: 0.94,
                    lifetime: [9, 18], size: [0.06, 0.02],
                    color: 0x9FE3D2, alpha: [0.5, 0], light: "world", maxParticles: 100
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dragonpulse", 1, DragonpulseDefinition);
