/**
 * 狂舞挥打 / brutalswing 的客户端表现。
 *
 * 一句话：施法者沉身收臂、暗色气旋在身周向里收拢 → 整个人横转一整圈，贴地一道暗紫弧面实时扫过，
 *   弧里被扫中的人炸出暗色冲击 → 转满一整圈后地面荡出一圈尘环淡去。
 * 色相家族：暗紫（0x6B4A8C 主体、0x9A7BC8 亮面）为主体，中性尘（0x8C8296）作地面尘，饱和亮紫只出现在冲击核心。
 * 拍子：起 gather（收势蓄力）→ 扫 sweep（弧面生长）→ 击 hit（扫中爆点）→ 收 settle（整圈尘环）。
 * 范围：sweep 用 `data.path`（与服务端 WorldGeometry.ring 同一半径的扇面）铺成多边形，弧面盖到哪就扫到哪；
 *   settle 用 `data.radius` 画整圈，半径直接读机制。
 * 运动：sweep 弧面沿转动的切向扫过并带一点外扩；hit 从命中点向外崩开；settle 尘环贴地向外扩再淡出。
 * 数：`data.intensity`（威力 / 60）抬高密度与亮度，`data.count`（威力换算）决定命中爆点量，
 *   `data.radius`／`data.scale`（机制半径换算）决定弧面与整圈的尺度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const BrutalswingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 26, shape: { kind: "cylinder", radius: 0.75, length: 1.5 },
                    direction: "inward", speed: [0.05, 0.2], spin: 14,
                    lifetime: [8, 15], size: [0.3, 0.08],
                    color: 0x6B4A8C, alpha: [0.55, 0], light: "world", maxParticles: 90
                },
                {
                    name: "charge", bind: "source", offset: [0, 0.6, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0x9A7BC8, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "reach_hint", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 2, start: 2, stop: 8,
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3 } },
                    direction: "shape", speed: [0.0, 0.0], spin: 6,
                    lifetime: [8, 14], size: [0.22, 0.1],
                    color: 0x6B4A8C, alpha: [0.22, 0], light: "world", maxParticles: 6
                }
            ]
        },
        sweep: {
            duration: 0,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "fan_fill", bind: "path", offset: [0, 0.16, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    shape: { kind: "polygon" },
                    rate: 70, direction: "shape", speed: [0.03, 0.14], spin: 10,
                    lifetime: [7, 13], size: [0.28, 0.05], sizeMode: "index",
                    color: 0x6B4A8C, alpha: [0.34, 0], light: "full", maxParticles: 150
                },
                {
                    name: "fan_edge", bind: "path", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/slash",
                    shape: { kind: "polyline", closed: true },
                    rate: 44, direction: "shape", speed: [0.06, 0.18], spread: 12,
                    lifetime: [5, 10], size: [0.26, 0.04], sizeMode: "index",
                    color: 0xB58FE0, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 130
                },
                {
                    name: "fan_dust", bind: "path", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: 30, direction: "shape", speed: [0.03, 0.12], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.05, 0.02],
                    color: 0x8C8296, alpha: [0.34, 0], light: "world", maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 18,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.26], spread: 26,
                    lifetime: [7, 13], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xB58FE0, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "shard", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spin: 12,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0x9A7BC8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        settle: {
            duration: 26,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "ring_out", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 3 } },
                    direction: "outward", speed: [0.1, 0.28],
                    lifetime: [10, 18], size: [0.5, 1.2], sizeMode: "sin",
                    color: 0x9A7BC8, alpha: [0.5, 0], light: "full", maxParticles: 6
                },
                {
                    name: "dust_ring", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "count", fallback: 16 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 3 } },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.05, drag: 0.92,
                    lifetime: [12, 20], size: [0.06, 0.02],
                    color: 0x8C8296, alpha: [0.4, 0], light: "world", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_brutalswing", 1, BrutalswingDefinition);
