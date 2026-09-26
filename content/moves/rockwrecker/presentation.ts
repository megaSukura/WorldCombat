/**
 * 岩石炮 / rockwrecker 的客户端表现。
 *
 * 一句话：施法者把一块巨石举过头顶，沿抛物线砸向选定落点；实体石轮廓清楚、下方跟着一枚地面影，落地的一刻整块石头
 * 碎开，一圈石灰岩屑向外炸开、地面扬起短命的碎石尘，随后施法者身上只剩一层疲惫的余尘。
 * 色相家族：石灰与土褐（large_rock／earth／tinydust 原色、impact_rock 亮帧），裂纹用近白高光。
 * 拍子：起（windup 举石）→ 抛（throw 起手 → flight 飞行）→ 击（shatter 碎裂、crush 每目标、rubble 临时碎石）→ 收（spent 起、recharge 维持力竭）。
 * 范围：shatter 绑落点、fit none，裂纹环与碎屑按 `data.scale`（碎裂半径 / 1.9）铺开——画出的那圈就是实际碎裂范围。
 * 运动：巨石沿抛物线飞行、尾迹贴投射物历史、地面影跟着下落；落地碎屑向外抛并受重力；被顶开的方向由碎屑流读出。
 * 数：`data.count`（巨石威力换算）决定碎屑数量，`data.intensity`（威力/150）决定碎屑与裂纹密度，
 * `data.shove`（顶开距离）决定碎屑向外拉的距离，`data.debris`（碎石停留）决定临时碎石场的存续，`data.seconds`（力竭秒数）决定收场余尘密度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const RockwreckerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: { data: "windup", fallback: 12 },
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "hoist_rock", bind: "source", offset: [0, 1.0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: 26, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [7, 13], size: [0.3, 0.14], sizeMode: "sin",
                    color: 0xB0A896, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "strain_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [5, 11], size: [0.05, 0.02],
                    color: 0x8A7A5A, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        },
        throw: {
            duration: 20,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "release", bind: "source", offset: [0, 0.9, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 18, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x6E6152, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        flight: {
            duration: 120,
            exit: { stop: 80, drain: 24 },
            emitters: [
                {
                    name: "boulder_chunks", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: 30, shape: { kind: "point" },
                    direction: "shape", speed: [0.01, 0.05], trail: { minDistance: 0.18 },
                    lifetime: [6, 12], size: [0.24, 0.08],
                    color: 0xA89F8C, alpha: [0.8, 0], light: "world", maxParticles: 200
                },
                {
                    name: "flight_dust", bind: "projectile", offset: [0, 0, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 34, shape: { kind: "point" },
                    direction: "up", speed: [0.01, 0.05], trail: { minDistance: 0.2 },
                    lifetime: [8, 15], size: [0.24, 0.5],
                    color: 0x6E6152, alpha: [0.3, 0], light: "world", maxParticles: 160
                },
                {
                    name: "landing_shadow", bind: "projectile", fit: "none", offset: [0, -0.55, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 5, shape: { kind: "point" },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [6, 12], size: [0.35, 0.85], sizeMode: "linear",
                    color: 0x2E2A22, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        shatter: {
            duration: 40,
            exit: { stop: 20, drain: 24 },
            emitters: [
                {
                    name: "impact_core", bind: "point", fit: "none", offset: [0, 0.35, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 24, at: 0 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.08, 0.34], spread: 24,
                    lifetime: [7, 13], size: [0.44, 0.05], sizeMode: "index",
                    color: 0xF2EEE6, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "crack_ring", bind: "point", fit: "none", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 1.9 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [14, 22], size: [0.7, 0.16], sizeMode: "linear",
                    color: 0xCFC4AE, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "rock_shards", bind: "point", fit: "none", offset: [0, 0.4, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "count", fallback: 70 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: [0.08, 0.34],
                    gravity: 0.09, drag: 0.86,
                    lifetime: [12, 22], size: [0.16, 0.03], sizeMode: "index",
                    color: 0x9E9480, alpha: [0.85, 0], light: "world", maxParticles: 320
                },
                {
                    name: "ground_dust", bind: "point", fit: "none", offset: [0, 0.07, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 40, at: 0 },
                    shape: { kind: "circle", radius: 1.9, thickness: 0.9 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [10, 20], size: [0.12, 0.02],
                    color: 0x7A6E5A, alpha: [0.5, 0], light: "world", maxParticles: 200
                }
            ]
        },
        crush: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "grit", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xCFC4AE, alpha: [0.7, 0], light: "world", maxParticles: 120
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "short_dust", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 22, at: 0 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0x7A6E5A, alpha: [0.4, 0], light: "world", maxParticles: 70
                }
            ]
        },
        rubble: {
            duration: { data: "debris", fallback: 60 },
            exit: { stop: 20, drain: 24 },
            emitters: [
                {
                    name: "settled_rubble", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: { data: "count", fallback: 8 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1.9 }, thickness: 0.7 },
                    direction: "outward", speed: [0.0, 0.02],
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 24], size: [0.08, 0.02], sizeMode: "index",
                    color: 0x8C8270, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "settling_dust", bind: "point", fit: "none", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "circle", radius: { data: "radius", fallback: 1.9 }, thickness: 0.8 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 24], size: [0.06, 0.02],
                    color: 0x7A6E5A, alpha: [0.28, 0], light: "world", maxParticles: 50
                }
            ]
        },
        spent: {
            duration: 32,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "settle_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "count", fallback: 20 }, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.03, 0.11],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xBFB4A0, alpha: [0.4, 0], light: "world"
                },
                {
                    name: "strain_grit", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.06, 0.02],
                    color: 0x8A7A5A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        recharge: {
            duration: 60,
            exit: { stop: 40, drain: 20 },
            emitters: [
                {
                    name: "ground_haze", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [14, 22], size: [0.05, 0.02],
                    color: 0x8A7A5A, alpha: [0.3, 0], light: "world", maxParticles: 20
                },
                {
                    name: "droop", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 3, shape: { kind: "sphere", radius: 0.24 },
                    direction: "down", speed: [0.004, 0.02],
                    lifetime: [16, 26], size: [0.07, 0.02],
                    color: 0x9E9480, alpha: [0.3, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_rockwrecker", 1, RockwreckerDefinition);
