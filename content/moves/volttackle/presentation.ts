/**
 * 伏特攻击 / volttackle 的客户端表现。
 *
 * 一句话：电荷从四周收拢、在全身蓄成一团越涨越大的电球，随后整个人裹着电爆冲出去；撞实的一刻积压的电荷
 * 从落点向四周炸开，沿地面把旁边的其他人一起缠上电弧；冲空则电荷在脚下泄放。
 * 色相家族：电黄（0xF2D03A）与冷白（0xEAF6FF），电弧的蓝（0x5AC8F0）只在放电与反噬层。
 * 拍子：蓄 charge（聚电成球）→ 冲 rush（带电爆冲）→ 行 wake（电痕）→ 爆 burst（命中主目标）→ 放 discharge（波及旁人）→ 噬 recoil（回路反噬）／ 泄 vent（冲空）。
 * 范围：rush 的冲刺线沿 `data.path` 两顶点铺成一条电带（横向按 `data.scale` 缩放）；discharge 的爆发线从落点连向每个被波及的人，画出的就是放电波及的范围。
 * 运动：电荷向身体中心收拢、冲锋时向后甩；放电从落点向外扑。
 * 数：`data.sparks`（速度与特攻派生）决定电花与爆发电弧的数量，`data.intensity`（本次伤害派生）决定命中强度，
 * `data.charged`（1 表示主目标还没麻痹）决定命中核心是否多一圈蓄能电弧，`data.discharge`（1 表示泄放式）决定蓄电足不足。
 */
const VolttackleDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 30,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: { data: "sparks", fallback: 26 }, shape: { kind: "sphere_surface", radius: 0.9 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [7, 13], size: [0.18, 0.03],
                    color: 0xF2D03A, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 120
                },
                {
                    name: "core", bind: "source", offset: [0, 0.6, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.42 }, direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.24, 0.04], sizeMode: "sin",
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", bloom: 0.6, maxParticles: 40
                },
                {
                    name: "ground", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 6, shape: { kind: "ring", radius: 0.5 }, direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0x5AC8F0, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        rush: {
            duration: 44,
            exit: { stop: 24, drain: 16 },
            emitters: [
                {
                    name: "track", bind: "path", offset: [0, 0.1, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    shape: { kind: "polyline" },
                    rate: { data: "sparks", fallback: 26 }, speed: [0.03, 0.12], spread: 24,
                    lifetime: [6, 12], size: [0.15, 0.03], sizeMode: "index",
                    color: 0xEAF6FF, alpha: [0.65, 0], light: "full", maxParticles: 240
                },
                {
                    name: "arc", bind: "source", offset: [0, 0.5, 0], height: 0.5, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    rate: 40, shape: { kind: "box", size: [0.36, 0.34, 0.36] }, direction: "shape",
                    speed: [0.03, 0.14], trail: { minDistance: 0.22 },
                    lifetime: [5, 10], size: [0.19, 0.05],
                    color: 0xF2D03A, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 220
                },
                {
                    name: "rush", bind: "source", offset: [0, 0.42, 0], height: 0.38,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 28, shape: { kind: "box", size: [0.32, 0.26, 0.32] }, direction: "shape",
                    speed: [0.02, 0.1], trail: { minDistance: 0.26 },
                    lifetime: [5, 8], size: [0.16, 0.05],
                    color: 0xEAF6FF, alpha: [0.6, 0], light: "full", maxParticles: 150
                }
            ]
        },
        wake: {
            duration: 8,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "static", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    rate: 9, shape: { kind: "ring", radius: 0.32 }, direction: "outward", speed: [0.03, 0.1],
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0xF2D03A, alpha: [0.55, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 28
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "target", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "sparks", fallback: 26 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "shape", speed: [0.1, 0.34], spread: 16,
                    lifetime: [7, 13], size: [0.44, 0.06], sizeMode: "index",
                    color: 0xF2D03A, alpha: [1, 0], light: "full", bloom: 0.65
                },
                {
                    name: "charged", bind: "target", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "charged", fallback: 1 }, repeats: 12, interval: 1 },
                    shape: { kind: "sphere", radius: 0.34 }, direction: "outward", speed: [0.06, 0.22],
                    lifetime: [8, 14], size: [0.22, 0.03],
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        discharge: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "arcline", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    shape: { kind: "polyline" },
                    burst: { count: { data: "sparks", fallback: 26 } },
                    lifetime: [6, 12], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xF2D03A, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 140
                },
                {
                    name: "cling", bind: "target", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.42 }, direction: "outward",
                    speed: [0.08, 0.24], spin: 12, lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x5AC8F0, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        recoil: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "backflow", bind: "source", offset: [0, 0.55, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 12 },
                    shape: { kind: "hemisphere", radius: 0.46, rotation: [180, 0, 0] }, direction: "up",
                    speed: [0.06, 0.24], lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0x5AC8F0, alpha: [0.7, 0], light: "full", maxParticles: 34
                },
                {
                    name: "leak", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.42 }, direction: "outward",
                    speed: [0.05, 0.2], lifetime: [9, 15], size: [0.08, 0.02],
                    color: 0xF2D03A, alpha: [0.6, 0], gravity: 0.03, drag: 0.9, light: "world", maxParticles: 60
                }
            ]
        },
        vent: {
            duration: 26,
            exit: { stop: 11, drain: 18 },
            emitters: [
                {
                    name: "vent", bind: "source", offset: [0, 0.14, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: { data: "sparks", fallback: 26 } },
                    shape: { kind: "hemisphere", radius: 0.5, rotation: [180, 0, 0] }, direction: "up",
                    speed: [0.08, 0.3], spread: 18, lifetime: [8, 14], size: [0.32, 0.05], sizeMode: "index",
                    color: 0xF2D03A, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "crackle", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 24 }, shape: { kind: "ring", radius: 0.55 }, direction: "outward",
                    speed: [0.08, 0.22], lifetime: [10, 16], size: [0.32, 0.07],
                    color: 0xEAF6FF, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_volttackle", 1, VolttackleDefinition);
