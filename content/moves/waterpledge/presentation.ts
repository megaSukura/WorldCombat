/**
 * 水之誓约 / waterpledge 的客户端表现。
 *
 * 一句话：落点先浮出一圈青蓝的水纹符文，随后一根水柱涌地而起，把柱内的人浇透、顶起推开，柱脚浸出一汪
 *   带气泡的水渍；与火／草共鸣时，光点与虹彩从地面升起，或塌成一汪冒泡的湿地。
 * 色相家族：青蓝到近白（waterjet／giantplash／water_ripple／smallbubble／impact_water）；彩虹时刻引入虹彩
 *   （shinesparkle_rainbow／glowingsparkle_pink），湿地时刻引入土褐（mudbubble），与三誓约的另两色相分开。
 * 拍子：起（mark 地面水纹）→ 击（erupt 水柱 + hit 命中点）→ 留（scar 水渍，或 rainbow／wetland 组合场）。
 * 范围：mark／scar／rainbow／wetland 的花环半径 = `data.scale` × 参考 1.6 格（= 实际誓约印半径）；
 *   erupt 的柱体 shape 直接绑定 `data.radius`／`data.height`，画面里的那根水柱就是实际判定柱。
 * 运动：水柱向上涌、水花向外炸开并带重力下落、气泡上浮；彩虹的光点上升；湿地的泥泡从水里冒起。
 * 数：`data.count`（由特攻与本次威力派生）决定水花与组合场的粒子数量，`data.combo` 在共鸣时切到组合场。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const WaterpledgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        mark: {
            duration: 30,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "sigil", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 26, shape: { kind: "ring", radius: 1.6 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.22, 0.02], sizeMode: "index",
                    color: 0x66CCEE, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "rune_bubble", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 14, shape: { kind: "ring", radius: 1.4 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xBFE8F5, alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        erupt: {
            duration: 24,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "column_water", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    burst: { count: { data: "count", fallback: 60 }, interval: 2, repeats: 6 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.3 } },
                    direction: "up", speed: [0.15, 0.6],
                    lifetime: [10, 20], size: [0.32, 0.05], sizeMode: "index",
                    color: 0x66CCEE, alpha: [0.85, 0], gravity: -0.03, drag: 0.94, light: "full", maxParticles: 420
                },
                {
                    name: "column_splash", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "count", fallback: 40 }, interval: 2, repeats: 5 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.3 } },
                    direction: "shape", speed: [0.1, 0.5],
                    lifetime: [10, 20], size: [0.2, 0.03],
                    color: 0xE0F6FF, alpha: [0.9, 0], gravity: 0.05, drag: 0.95, light: "full", maxParticles: 320
                },
                {
                    name: "column_bubbles", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 120,
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 1.5 }, length: { data: "height", fallback: 3.3 } },
                    direction: "up", speed: [0.1, 0.45],
                    lifetime: [12, 24], size: [0.12, 0.02],
                    color: 0xDFF6FF, alpha: [0.8, 0], gravity: -0.04, drag: 0.96, light: "full", maxParticles: 260
                },
                {
                    name: "ground_splash", bind: "point", height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 } },
                    direction: "outward", speed: [0.06, 0.25],
                    lifetime: [8, 14], size: [0.16, 0.02],
                    color: 0xCFEFFA, alpha: [0.7, 0], gravity: 0.06, light: "world", maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: 7, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "shape", speed: [0.08, 0.3],
                    lifetime: [7, 13], size: [0.4, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "spray", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/fishsplash",
                    burst: { count: { data: "count", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.45],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xCFEFFA, alpha: [0.95, 0], gravity: 0.05, light: "full"
                }
            ]
        },
        scar: {
            duration: 30,
            exit: { stop: 20, drain: 26 },
            emitters: [
                {
                    name: "pool", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 24, shape: { kind: "circle", radius: 1.6 },
                    direction: "shape", speed: [0.01, 0.06],
                    lifetime: [14, 24], size: [0.2, 0.03],
                    color: 0x66CCEE, alpha: [0.55, 0], light: "world", maxParticles: 100
                },
                {
                    name: "bubbles", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 12, shape: { kind: "circle", radius: 1.5 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0xDFF6FF, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        rainbow: {
            duration: 34,
            exit: { stop: 22, drain: 30 },
            emitters: [
                {
                    name: "rainbow_rise", bind: "point", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    rate: 32, shape: { kind: "circle", radius: 1.6 },
                    direction: "up", speed: [0.02, 0.12],
                    lifetime: [16, 28], size: [0.14, 0.02],
                    alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 150
                },
                {
                    name: "blessing", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 16, shape: { kind: "circle", radius: 1.6 },
                    direction: "up", speed: [0.01, 0.08],
                    lifetime: [14, 24], size: [0.1, 0.02],
                    color: 0xFFD7EE, alpha: [0.8, 0], light: "full", maxParticles: 80
                },
                {
                    name: "halo", bind: "point", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 10, at: 0, interval: 14, repeats: 3 },
                    shape: { kind: "ring", radius: 1.6 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [14, 22], size: [0.4, 0.12],
                    color: 0xFFF0B0, alpha: [0.5, 0], light: "full", maxParticles: 48
                }
            ]
        },
        wetland: {
            duration: 34,
            exit: { stop: 22, drain: 30 },
            emitters: [
                {
                    name: "mire", bind: "point", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/mud/mudbubble",
                    rate: 30, shape: { kind: "circle", radius: 1.6 },
                    direction: "up", speed: [0.005, 0.03],
                    lifetime: [16, 30], size: [0.18, 0.03],
                    color: 0x6A5230, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "wet_pulse", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 20, shape: { kind: "circle", radius: 1.6 },
                    direction: "shape", speed: [0.01, 0.06],
                    lifetime: [14, 24], size: [0.2, 0.03],
                    color: 0x7FB8A8, alpha: [0.45, 0], light: "world", maxParticles: 100
                },
                {
                    name: "reeds", bind: "point", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "circle", radius: 1.5 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.1, 0.02],
                    color: 0x5E8A3A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_waterpledge", 1, WaterpledgeDefinition);
