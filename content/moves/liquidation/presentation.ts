/**
 * 水流裂破 / liquidation 的客户端表现。
 *
 * 一句话：水先在身上压成一层贴身的窄刃，向前踏出半步；随后这层刃贴着身体由一侧向另一侧扫过，
 * 只有当前刃段发白沫水花；扫到的目标在接触面炸开一记水花，破防时顺着裂口留几道亮青的裂痕。
 * 色相家族：水蓝与近白泡沫（water_ripple / giantsplash / impact_water / waterjet 原色）为底，
 * 裂痕与渗水用高饱和亮青，只在破防的小面积上出现。
 * 拍子：起（windup 聚水）→ 踏（step 前踏）→ 扫（blade 触及横扫）→ 击（hit 接触水花）→ 收（crack 裂痕 / miss 收势）。
 * 范围：blade 绑施法者、随它移动，`orient: "heading"` 读 `data.direction`，用 `data.reach` 与 `data.blade` 画出与判定
 * 同一份原点、半径、张角的窄刃段；hit 与 crack 都绑命中点，画出的就是刃段擦到的位置。
 * 运动：聚水向内收成壳，前踏溅一小片，刃段随方向逐拍转向并向外喷，命中是整片外爆，裂痕沿球面向外扯开。
 * 数：`data.reach`（扇刃半径）定刃长，`data.blade`（本拍刃张角）定刃宽，`data.scale`（水刃厚度 / 0.42）放大尺寸，
 * `data.bursts`（16 + 威力 × 0.2）直接绑定命中的总溅水量，`data.spokes`（破防级数 × 10）决定裂痕条数，
 * `data.progress` 是横扫进度，`data.intensity`（本击威力 / 85）抬高核心亮度。
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
        step: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "plant", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.05, drag: 0.94,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0x9FC6DE, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        blade: {
            duration: 0,
            exit: { stop: 0, drain: 12 },
            emitters: [
                {
                    name: "edge", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 46, orient: "heading", fit: "world",
                    shape: { kind: "sector", radius: { data: "reach", fallback: 2.7 }, innerRadius: 0.3,
                        angleDegrees: { data: "blade", fallback: 30 } },
                    direction: "outward", speed: [0.08, 0.26], spread: 6,
                    lifetime: [5, 10], size: [0.14, 0.035],
                    alpha: [0.9, 0], light: "full", maxParticles: 180
                },
                {
                    name: "foam", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 26, orient: "heading", fit: "world",
                    shape: { kind: "sector", radius: { data: "reach", fallback: 2.7 }, innerRadius: 0.3,
                        angleDegrees: { data: "blade", fallback: 30 } },
                    direction: "outward", speed: [0.05, 0.18], sizeMode: "sin",
                    lifetime: [6, 12], size: [0.16, 0.04],
                    color: 0xBFE6FF, alpha: [0.7, 0], light: "full", maxParticles: 140
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [6, 11], size: [0.38, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 70
                },
                {
                    name: "burst", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "bursts", fallback: 30 } },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.08, 0.3], gravity: 0.05, drag: 0.92,
                    lifetime: [9, 16], size: [0.24, 0.05],
                    color: 0xBFE6FF, alpha: [0.78, 0], light: "full", maxParticles: 200
                }
            ]
        },
        crack: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
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
                    burst: { count: 20, at: 2 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x9FE4FF, alpha: [0.7, 0], light: "world", maxParticles: 90
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
                    burst: { count: 24 },
                    shape: { kind: "ring", radius: 0.44, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.05, drag: 0.94,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0x9FC6DE, alpha: [0.5, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_liquidation", 1, LiquidationDefinition);
