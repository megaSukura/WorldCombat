/**
 * 舍身冲撞 / doubleedge 的客户端表现。
 *
 * 一句话：压低身体沿一条直线把整个人砸出去，撞实的一刻从命中点炸开一片土白冲击，随后两股烟尘分别朝相反
 * 方向被甩开——这正是这招的身份：撞完双方都被弹开。
 * 色相家族：一般系的灰白与暖土（0xE9E2D3 / 0xC9C2B4），土褐只出现在贴地尘里，饱和暖橙只给冲击核心一点。
 * 拍子：起 tempo（踏地蓄势）→ 撞 charge（直线冲刺）→ impact（命中峰值）＋ rebound（双方弹开）／ skid（冲空收势）。
 * 范围：charge 的冲刺尘沿 `data.path` 与身体一起铺开；impact 绑命中点，画的就是撞到哪。
 * 运动：速度线沿冲撞方向掠过；命中后尘屑沿冲撞方向退去，反弹尘从自己身上朝反方向散开。
 * 数：`data.dust`（速度与体重派生）决定冲刺与命中的尘屑总量，`data.intensity`（威力 / 115）抬高密度与亮度，
 * `data.scale`（判定半径 / 0.55）放大撞面与尘环，`data.ratio` 让冲刺尘随路程变浓。
 */
const DoubleedgeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tempo: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dig_in", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 10, shape: { kind: "ring", radius: 0.38 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xBFAE94, alpha: [0.5, 0], gravity: 0.03, drag: 0.93, light: "world", maxParticles: 30
                },
                {
                    name: "coil", bind: "source", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 8, shape: { kind: "hemisphere", radius: 0.28, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xE9E2D3, alpha: [0.45, 0], light: "world", maxParticles: 26
                }
            ]
        },
        charge: {
            duration: 48,
            exit: { stop: 30, drain: 14 },
            emitters: [
                {
                    name: "rush", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 40, shape: { kind: "box", size: [0.34, 0.3, 0.34] },
                    direction: "shape", speed: [0.02, 0.1], trail: { minDistance: 0.22 },
                    lifetime: [5, 9], size: [0.2, 0.06],
                    color: 0xF2ECE0, alpha: [0.7, 0], light: "full", maxParticles: 220
                },
                {
                    name: "plough", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: { data: "dust", fallback: 24 }, shape: { kind: "ring", radius: 0.36, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [8, 16], size: [0.1, 0.02], sizeMode: "index",
                    color: 0xBFAE94, alpha: [0.5, 0], gravity: 0.03, drag: 0.92, light: "world", maxParticles: 200
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "dust", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "shape", speed: [0.06, 0.24], spread: 16,
                    lifetime: [7, 13], size: [0.42, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 90
                },
                {
                    name: "grit", bind: "target", height: 0.38,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 24 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.28],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xC9C2B4, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "shock", bind: "target", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 28 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.22], spread: 8,
                    lifetime: [10, 17], size: [0.34, 0.08],
                    color: 0xE9E2D3, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        rebound: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "backslide", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 24 } },
                    shape: { kind: "hemisphere", radius: 0.42, rotation: [180, 0, 0] },
                    direction: "up", speed: [0.06, 0.22],
                    gravity: 0.04, drag: 0.91,
                    lifetime: [9, 16], size: [0.1, 0.02],
                    color: 0xBFAE94, alpha: [0.55, 0], light: "world", maxParticles: 120
                },
                {
                    name: "strain", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 7 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [8, 14], size: [0.14, 0.04],
                    color: 0xD9A85C, alpha: [0.5, 0], light: "full", maxParticles: 24
                }
            ]
        },
        skid: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "brake", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 24 } },
                    shape: { kind: "sphere_surface", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0xBFAE94, alpha: [0.5, 0], light: "world", maxParticles: 100
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_doubleedge", 1, DoubleedgeDefinition);
