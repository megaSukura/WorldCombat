/**
 * 火焰旋涡 / firespin 的客户端表现。
 *
 * 一句话：施法者掌心先卷起一撮回旋的火舌，随后火种追着目标飞去，命中的地方腾起一道绕着目标打转、跟着它走的火柱；
 * 火柱不断往目标身上舔火、把地面烤出焦痕；目标湿透时火柱「嗤」地化成一团白汽熄灭。
 * 色相家族：橙红（0xE86A2A）为主、亮黄（0xFFD060）做火舌高光、近白（0xFFF0C0）只在中心；焦痕用暗褐。
 * 拍子：起（charge 聚火）→ 掷（cast 火种）→ 驻（wrap 立柱 / column 回旋 / lick 舔火）→ 收（release / douse）。
 * 范围：column 是 `bind: "target"`，用 `data.radius` 画横截面、`data.height` 画柱高——目标站在哪，那圈火就跟到哪。
 * 运动：火柱沿局部 +Y 上升并自转，火舌向外甩后被拽回；舔火时整柱炸出一圈火舌。
 * 数：`data.flow`（火柱半径派生）决定火柱密度，`data.count`（灼烧威力派生）决定舔火那下的火舌量，
 *   `data.intensity`（威力 / 24）抬高亮度，`data.pulses`（已舔次数）让火柱越烧越旺，`data.scale`（半径 / 0.85）控制粒子尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const FirespinDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 22, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.03, 0.12], spin: 10,
                    lifetime: [7, 13], size: [0.16, 0.03],
                    color: 0xE86A2A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "embers", bind: "source", offset: [0, 0.45, 0.3], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [6, 11], size: [0.07, 0.02],
                    color: 0xFFD060, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        cast: {
            duration: 46,
            exit: { stop: 28, drain: 14 },
            emitters: [
                {
                    name: "seed", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: 40, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.02, 0.1], spread: 12, trail: { minDistance: 0.22 },
                    lifetime: [7, 12], size: [0.18, 0.04],
                    color: 0xE86A2A, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 150
                },
                {
                    name: "sparks", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 2, interval: 1, repeats: 14 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09], spread: 24,
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0xFFD060, alpha: [0.8, 0], light: "full", maxParticles: 80
                }
            ]
        },
        wrap: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "flare", bind: "target", offset: [0, 0.1, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 22, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "outward", speed: [0.07, 0.24], spread: 18,
                    lifetime: [7, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "sear", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1, at: 2 },
                    shape: { kind: "point" },
                    lifetime: [30, 40], size: [0.7, 0.9],
                    color: 0x4A3226, alpha: [0.5, 0], light: "world", alwaysRender: true
                }
            ]
        },
        column: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "vortex", bind: "target", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "cylinder", radius: { data: "radius", fallback: 0.85 }, length: { data: "height", fallback: 2.2 } },
                    direction: "up", speed: [0.03, 0.12], spread: 10, spin: 18,
                    gravity: -0.01, drag: 0.94,
                    lifetime: [8, 16], size: [0.2, 0.04],
                    color: 0xE86A2A, alpha: [0.4, 0], light: "full", bloom: 0.25, maxParticles: 260
                },
                {
                    name: "tongues", bind: "target", offset: [0, 0.1, 0], height: 0.1, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "flow", fallback: 60 }, shape: { kind: "ring", radius: { data: "radius", fallback: 0.85 } },
                    direction: "outward", speed: [0.04, 0.16], spin: 14,
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xFFD060, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 180
                },
                {
                    name: "ash", bind: "target", offset: [0, 0.5, 0], height: 0.3, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "cylinder", radius: { data: "radius", fallback: 0.85 }, length: { data: "height", fallback: 2.2 } },
                    direction: "up", speed: [0.01, 0.06], spread: 20,
                    gravity: 0.03, drag: 0.93,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0x6E5546, alpha: [0.4, 0], light: "world", maxParticles: 90
                }
            ]
        },
        lick: {
            duration: 20,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.28], spread: 18,
                    lifetime: [6, 11], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF0C0, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "sparks", bind: "target", offset: [0, 0.45, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.06, 0.22],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xFFD060, alpha: [0.8, 0], light: "full", maxParticles: 90
                }
            ]
        },
        release: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "subside", bind: "target", offset: [0, 0.3, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.14],
                    gravity: -0.003, drag: 0.94,
                    lifetime: [12, 20], size: [0.22, 0.04],
                    color: 0xB98A6A, alpha: [0.5, 0], light: "world", maxParticles: 70
                },
                {
                    name: "embers", bind: "target", offset: [0, 0.4, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.06, drag: 0.91,
                    lifetime: [10, 16], size: [0.07, 0.01],
                    color: 0xFFB060, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        douse: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "steam", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 26 },
                    shape: { kind: "cylinder", radius: 0.4, length: 1.4 },
                    direction: "up", speed: [0.03, 0.14],
                    gravity: -0.004, drag: 0.93,
                    lifetime: [12, 22], size: [0.26, 0.05],
                    color: 0xE8E8E8, alpha: [0.55, 0], light: "world", maxParticles: 90
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 10 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [6, 11], size: [0.06, 0.01],
                    color: 0xB98A6A, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_firespin", 1, FirespinDefinition);
