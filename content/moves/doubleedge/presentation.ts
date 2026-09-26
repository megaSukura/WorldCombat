/**
 * 舍身冲撞 / doubleedge 的客户端表现。
 *
 * 一句话：压低身体沿一条直线把整个人砸出去，撞实的一刻只在接触点上留下单枚沉重的挤压纹，身体随之明显减速、
 * 贴住目标压一小会儿，再在脚底两步尘埃里原地收势——不弹回、没有第二击，这正是这招的身份：贴压后露破绽。
 * 色相家族：一般系的灰白与暖土（0xE9E2D3 / 0xC9C2B4），土褐只出现在贴地尘里，饱和暖橙只给挤压核心一点。
 * 拍子：起 tempo（踏地蓄势）→ 撞 charge（直线冲刺）→ impact（单枚挤压纹）→ settle（脚底两步收势）。
 * 范围：charge 的冲刺尘沿 `data.path` 与身体一起铺开；impact 绑命中点，画的就是压到哪；settle 贴身体。
 * 运动：速度线沿冲撞方向掠过；命中只向内一收（挤压），随后收势尘贴地两步落定。
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
                    name: "press", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "inward", speed: [0.02, 0.08], spread: 10,
                    lifetime: [8, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 24
                },
                {
                    name: "squeeze", bind: "target", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "inward", speed: [0.04, 0.12], spread: 6,
                    lifetime: [10, 16], size: [0.3, 0.08],
                    color: 0xE9E2D3, alpha: [0.55, 0], light: "world"
                },
                {
                    name: "grit", bind: "target", height: 0.34,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "dust", fallback: 24 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xC9C2B4, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        settle: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "brake", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "dust", fallback: 24 }, interval: 6, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0xBFAE94, alpha: [0.5, 0], light: "world", maxParticles: 120
                },
                {
                    name: "steady", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, interval: 6, repeats: 2 },
                    shape: { kind: "ring", radius: 0.3, rotation: [90, 0, 0] },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xE9E2D3, alpha: [0.4, 0], gravity: 0.03, drag: 0.93, light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_doubleedge", 1, DoubleedgeDefinition);
