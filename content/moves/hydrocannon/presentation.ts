/**
 * 加农水炮 / hydrocannon 的客户端表现。
 *
 * 一句话：施法者身前的水流旋转收束成高压，随后一道笔直的水柱冲向目标，命中处炸开一圈蓝白水花并把目标顶退；
 * 被泼透的目标身上持续挂着滴水，标明「浸湿」这段时间；水柱落下后施法者身上只剩滴答的水痕。
 * 色相家族：青蓝（waterjet／water_ripple／giantsplash 原色、impact_water 亮帧），泡沫近白，钢灰作余韵。
 * 拍子：起（windup 聚水）→ 击（jet 飞行 + burst 命中爆花 / fizzle 落空）→ 收（drenched 维持、spent 起、recharge 维持力竭）。
 * 范围：burst 绑命中点、fit none，水花半径按 `data.scale`（判定半径 / 0.5）铺开——画出的那圈水就是命中判定的大小。
 * 运动：水柱沿瞄准方向飞行、尾迹贴投射物历史；命中处向外炸开并沿顶退方向拉出水痕；浸湿时水珠原地滴落。
 * 数：`data.count`（本击威力换算）决定命中水花数量，`data.intensity`（威力/150）决定水柱与爆花密度，
 * `data.shove`（顶开距离）决定水花向后拉的长度，`data.seconds`（力竭秒数）决定收场水痕密度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const HydrocannonDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 11 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_water", bind: "source", offset: [0, 0.65, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 40, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.05, 0.16],
                    lifetime: [6, 12], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0x6FC3E8, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 80
                },
                {
                    name: "spray", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 20, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xBFE8F7, alpha: [0.7, 0], light: "full", maxParticles: 50
                }
            ]
        },
        jet: {
            duration: 90,
            exit: { stop: 60, drain: 20 },
            emitters: [
                {
                    name: "jet_trail", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: { data: "count", fallback: 90 }, shape: { kind: "point" },
                    direction: "shape", speed: [0.01, 0.06], trail: { minDistance: 0.1 },
                    lifetime: [6, 11], size: [0.2, 0.05],
                    color: 0x5FB8EA, alpha: [0.9, 0], light: "full", maxParticles: 300
                },
                {
                    name: "jet_droplets", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 40, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.1], trail: { minDistance: 0.16 },
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xA8DCF2, alpha: [0.75, 0], light: "world", maxParticles: 180
                }
            ]
        },
        burst: {
            duration: 34,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "splash_core", bind: "point", fit: "none", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "count", fallback: 60 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.36], spread: 24,
                    lifetime: [7, 13], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "splash_ring", bind: "point", fit: "none", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 26, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 16], size: [0.38, 0.1],
                    color: 0x8FD0EE, alpha: [0.6, 0], light: "world"
                },
                {
                    name: "splash_froth", bind: "point", fit: "none", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "count", fallback: 26 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.07, 0.26],
                    gravity: 0.07, drag: 0.9,
                    lifetime: [10, 18], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xDCF3FB, alpha: [0.8, 0], light: "world", maxParticles: 160
                }
            ]
        },
        drench: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "drench_gush", bind: "target", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.06, 0.24],
                    gravity: 0.07, drag: 0.9,
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0xBFE8F7, alpha: [0.85, 0], light: "world", maxParticles: 100
                }
            ]
        },
        drenched: {
            duration: 60,
            exit: { stop: 40, drain: 20 },
            emitters: [
                {
                    name: "drip", bind: "target", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 6, shape: { kind: "sphere", radius: 0.34 },
                    direction: "down", speed: [0.01, 0.05],
                    gravity: 0.06, drag: 0.95,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x9FD4EE, alpha: [0.4, 0], light: "world", maxParticles: 28
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "wet_ground", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 20, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.14],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0x8FC8E0, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        },
        spent: {
            duration: 32,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "drain_down", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "count", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.08, 0.02],
                    color: 0x9FD4EE, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "settle_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0x8FC8E0, alpha: [0.45, 0], light: "world"
                }
            ]
        },
        recharge: {
            duration: 60,
            exit: { stop: 40, drain: 20 },
            emitters: [
                {
                    name: "seep", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 4, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 22], size: [0.05, 0.02],
                    color: 0x7FB6CE, alpha: [0.3, 0], light: "world", maxParticles: 20
                },
                {
                    name: "strain_bubble", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 3, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [16, 26], size: [0.05, 0.02],
                    color: 0x9FD4EE, alpha: [0.28, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hydrocannon", 1, HydrocannonDefinition);
