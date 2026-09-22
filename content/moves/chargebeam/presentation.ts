/**
 * 充电光束 / chargebeam 的客户端表现。
 *
 * 一句话：电弧从四周收进身前一点、越收越亮，压成一道白亮的细束笔直射向目标；命中处炸开一片电光，
 *   命中的施法者身上回灌一圈升腾的电弧，稍后命中点再迸一下余流。
 * 色相家族：电黄（0xFFE14D）与冷白（0xEAFBFF）为主——与十万伏特同族同色，符合「电与白光是一家」。
 * 拍子：起（charge 收电聚束）→ 射（travel 细束拖尾）→ 击（hit 炸开）→ 灌（surge 回灌升弧）→ 咬（residual 余流）→ 空（fizzle 散电）。
 * 范围：`hit` 的炸开半径用参考值 0.28 格书写，服务端把 `data.scale = 实际判定半径 / 0.28` 传进来，`fit: "none"`
 *   让几何跟着 `scale` 走——画出的圈就是判定尺度。
 * 运动：起手电弧向身前一点内收；细束沿直线飞行、拖尾跟着弹体；命中点向四周炸开，回灌电弧从施法者身上向上升。
 * 数：`data.arcs`（特攻派生）绑定电弧与环的条数，`data.flow`（威力派生）绑定拖尾密度，`data.intensity`（本次威力比例）
 *   缩放发射量，`data.stages`（回灌级数）绑定回灌电弧的量。
 */

const ChargebeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 10 },
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0.35], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 20, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [5, 11], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "core", bind: "source", offset: [0, 0.5, 0.35], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "arcs", fallback: 7 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [4, 8], size: [0.16, 0.03], sizeMode: "sin",
                    color: 0xEAFBFF, alpha: [0.95, 0], light: "full", bloom: 0.6, maxParticles: 50
                },
                {
                    name: "crackle", bind: "source", offset: [0, 0.5, 0.3], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [4, 9], size: [0.09, 0.02],
                    color: 0xFFF6C0, alpha: [0.75, 0], light: "full", maxParticles: 40
                }
            ]
        },
        travel: {
            duration: 90,
            exit: { stop: 80, drain: 16 },
            emitters: [
                {
                    name: "beam", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 44, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.01, 0.06],
                    lifetime: [4, 8], size: [0.18, 0.04], sizeMode: "sin",
                    color: 0xF2FBFF, alpha: [0.95, 0], light: "full", bloom: 0.6, maxParticles: 90
                },
                {
                    name: "trail", bind: "projectile", fit: "none", trail: { minDistance: 0.1 },
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "flow", fallback: 70 }, shape: { kind: "sphere", radius: 0.1 },
                    direction: "away", speed: [0.02, 0.12],
                    lifetime: [5, 11], size: [0.09, 0.02],
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "spark", bind: "projectile", fit: "none", trail: { minDistance: 0.18 },
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    rate: 18, shape: { kind: "sphere", radius: 0.08 },
                    direction: "outward", speed: [0.04, 0.18],
                    lifetime: [3, 7], size: [0.1, 0.02],
                    color: 0xEAFBFF, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "flash", bind: "point", offset: [0, 0.45, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "arcs", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.07, 0.32], spread: 16,
                    lifetime: [6, 12], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 100
                },
                {
                    name: "arcs", bind: "point", offset: [0, 0.4, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 8 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.34], spread: 12,
                    lifetime: [5, 12], size: [0.15, 0.04],
                    color: 0xFFE14D, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 100
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.28, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.26, 0.5],
                    color: 0xC8F0D0, alpha: [0.45, 0], light: "world", maxParticles: 12
                }
            ]
        },
        surge: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "surge_ring", bind: "source", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "stages", fallback: 1 } },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.24, 0.48],
                    color: 0xFFE14D, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 16
                },
                {
                    name: "surge_up", bind: "source", offset: [0, 0.25, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: { data: "arcs", fallback: 7 }, shape: { kind: "circle", radius: 0.55 },
                    direction: "up", speed: [0.1, 0.32], drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFE14D, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 70
                }
            ]
        },
        residual: {
            duration: 22,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "bite", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 6 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.24], spread: 14,
                    lifetime: [5, 11], size: [0.14, 0.03],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 60
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "groundout", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "arcs", fallback: 7 }, at: 1 },
                    shape: { kind: "ring", radius: 0.6, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xFFE14D, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.15, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.16, 0.26],
                    color: 0x6E7C88, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_chargebeam", 1, ChargebeamDefinition);
