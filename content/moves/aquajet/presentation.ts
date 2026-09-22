/**
 * 水流喷射 / aquajet 的客户端表现。
 *
 * 一句话：水在脚边聚成一圈环、身体裹上一层水膜，随后整条水柱贴着地面射出去，身后拖出长长的水花与气泡；
 *   撞上谁，谁身上炸开一记水花并被冲开，若带着火就腾起一股水汽；冲空时只在前方地上留下一圈涟漪与水点。
 * 色相家族：水蓝一族（0x4FC3E8 / 0x8FD4F0 为主体，0xE8F8FF 只做浪尖高光，水汽用中性灰），与水流尾同族但不画弧。
 * 拍子：起 gather（聚水裹身）→ 射 jet（鱼雷水柱）→ 击 burst（水花爆开）／浇 douse（水汽）→ 收 miss（空射涟漪）。
 * 范围：jet 的水柱沿施法者实际走过的轨迹铺开，就是鱼雷扫过的那条线；burst 绑命中点画在接触处。
 * 运动：水柱随身体前冲（沿锚点自身运动朝向），落点炸开是向外翻卷的水花与一圈涟漪。
 * 数：jet 的水花量绑定 `data.spray`（速度与体重换算），burst 的水花量同样绑定 `data.spray`，
 *   尺度绑定 `data.scale`（水柱半径换算），亮度绑定 `data.intensity`（水柱威力换算）。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const AquajetDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 3 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "gather_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/ripple_white",
                    rate: 10, shape: { kind: "ring", radius: 0.44 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 15], size: [0.26, 0.5],
                    color: 0xE8F8FF, alpha: [0.5, 0], light: "world", maxParticles: 20
                },
                {
                    name: "gather_sheet", bind: "source", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 22, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.18, 0.04],
                    color: 0x8FD4F0, alpha: [0.6, 0], light: "full", maxParticles: 36
                }
            ]
        },
        jet: {
            duration: 44,
            exit: { stop: 36, drain: 14 },
            emitters: [
                {
                    name: "head", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet_head",
                    rate: 40, shape: { kind: "cone", radius: 0.5, angleDegrees: 28 },
                    orient: "velocity", direction: "shape", speed: [0.1, 0.42], spread: 12,
                    lifetime: [6, 12], size: [0.5, 0.12], sizeMode: "index",
                    color: 0x8FD4F0, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "column", bind: "source", offset: [0, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/water/waterjet",
                    rate: 90, trail: { minDistance: 0.24 },
                    shape: { kind: "point" },
                    orient: "velocity", direction: "away", speed: [0.06, 0.26],
                    lifetime: [8, 15], size: [0.3, 0.07], sizeMode: "index",
                    color: 0x4FC3E8, alpha: [0.7, 0], light: "world", maxParticles: 200
                },
                {
                    name: "spray", bind: "source", offset: [0, 0.4, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "spray", fallback: 18 }, at: 0, interval: 3, repeats: 6 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "away", speed: [0.1, 0.34], spread: 26,
                    gravity: 0.06, drag: 0.94,
                    lifetime: [10, 18], size: [0.09, 0.02], sizeMode: "index",
                    color: 0xBFE8FA, alpha: [0.75, 0], light: "full", maxParticles: 120
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "burst_splash", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "spray", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.1, 0.36], spread: 26,
                    gravity: 0.07, drag: 0.92,
                    lifetime: [8, 16], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xBFE8FA, alpha: [0.95, 0], light: "full", maxParticles: 80
                },
                {
                    name: "burst_ring", bind: "target", offset: [0, 0.28, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [10, 18], size: [0.28, 0.7],
                    color: 0x8FD4F0, alpha: [0.55, 0], light: "world", maxParticles: 6
                },
                {
                    name: "burst_jet", bind: "target", offset: [0, 0.3, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "spray", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.12, 0.4], spread: 24,
                    lifetime: [7, 14], size: [0.3, 0.08], sizeMode: "index",
                    color: 0xE8F8FF, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        douse: {
            duration: 30,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "steam", bind: "target", offset: [0, 0.3, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [14, 26], size: [0.3, 0.12],
                    color: 0xB9C4CC, alpha: [0.45, 0], light: "world", maxParticles: 36
                },
                {
                    name: "drops", bind: "target", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xE8F8FF, alpha: [0.6, 0], light: "full", maxParticles: 28
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "miss_puddle", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.3, 0.8],
                    color: 0x8FD4F0, alpha: [0.35, 0], light: "world", maxParticles: 4
                },
                {
                    name: "miss_drops", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "spray", fallback: 18 }, at: 0 },
                    shape: { kind: "ring", radius: 0.6 },
                    direction: "outward", speed: [0.04, 0.14],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.07, 0.02], sizeMode: "index",
                    color: 0xBFE8FA, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aquajet", 1, AquajetDefinition);
