/**
 * 水流裂破 / liquidation 的客户端表现。
 *
 * 一句话：水先在身上裹成一层贴身的刃、随人一起前进，撞实的一刻水刃从接触面整片炸开，顺着裂口在目标
 * 身上留下几道亮青的裂痕，湿水从裂口往里渗。
 * 色相家族：水蓝与近白泡沫（water_ripple / giantsplash / impact_water 原色）为底，裂痕与渗水用高饱和亮青，
 * 只在破防幕的小面积上出现。
 * 拍子：起（windup 聚水）→ 行（shroud 裹水前进）→ 击（impact 水刃炸开）→ 收（crack 裂痕 / miss 收势）。
 * 范围：impact 与 crack 都绑命中点，画出的就是水刃劈开的位置；shroud 贴施法者、随它一起移动。
 * 运动：聚水向内收成壳，行进时水痕沿历史拖尾，命中是整片外爆，裂痕沿球面向外扯开。
 * 数：`data.scale`（水刃半径 / 0.5）放大水壳与炸开范围，`data.bursts`（18 + 威力 × 0.24）直接绑定命中的
 * 总溅水量，`data.spokes`（破防级数 × 10）决定裂痕的条数，`data.intensity`（本击威力 / 85）抬高核心亮度。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const LiquidationDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 18, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [8, 15], size: [0.16, 0.04],
                    color: 0x7FBCE8, alpha: [0.55, 0], light: "full", maxParticles: 56
                },
                {
                    name: "damp_ground", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 12, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x8FA6B8, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        shroud: {
            duration: 48,
            exit: { stop: 36, drain: 14 },
            emitters: [
                {
                    name: "blade_shell", bind: "source", offset: [0, 0.5, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 40, shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "inward", speed: [0.04, 0.15],
                    lifetime: [6, 12], size: [0.22, 0.05], sizeMode: "sin",
                    color: 0x6FB6E8, alpha: [0.62, 0], light: "full", maxParticles: 240
                },
                {
                    name: "edge_jet", bind: "source", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 20, shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.06, 0.2], spread: 8,
                    lifetime: [5, 10], size: [0.16, 0.04],
                    alpha: [0.8, 0], light: "full", maxParticles: 160
                },
                {
                    name: "wake", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 30, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x9FC6DE, alpha: [0.45, 0], light: "world", maxParticles: 140
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 20, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [7, 12], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 80
                },
                {
                    name: "burst", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "bursts", fallback: 38 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.08, 0.3],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.26, 0.05],
                    color: 0xBFE6FF, alpha: [0.78, 0], light: "full", maxParticles: 260
                }
            ]
        },
        crack: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "fissure", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    burst: { count: { data: "spokes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.42, thickness: 0.85 },
                    direction: "outward", speed: [0.1, 0.3], spread: 4,
                    lifetime: [8, 14], size: [0.2, 0.03], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "bleed", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 22, at: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x9FE4FF, alpha: [0.7, 0], light: "world", maxParticles: 100
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "spill", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 26 },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0x9FC6DE, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_liquidation", 1, LiquidationDefinition);
