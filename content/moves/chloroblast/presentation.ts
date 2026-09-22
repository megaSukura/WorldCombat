/**
 * 叶绿爆震 / chloroblast 的客户端表现。
 *
 * 一句话：施法者把全身的叶绿素收进核心，再从身前朝准线喷成一整片青绿的扇形爆流；罩住谁谁身上炸开一丛叶屑，
 * 放完之后施法者身上落下一层枯黄的碎叶——叶绿素被抽空的代价直接看得见。
 * 色相家族：新绿到青黄（razorleaf／leaf 原色、impact_grass 亮帧、energyorb 青绿），枯叶用低饱和黄绿与灰。
 * 拍子：起 gather（收绿）→ 放 release（扇形爆流）→ 中 hit（叶屑）／ 空 fizzle（尽头散叶）→ 枯 wither（落枯叶）。
 * 范围：release 用 `data.path` 画出服务端扇形的同一组顶点（顶点 + 弧）——扇形铺多大、张多开，画面就是那片绿。
 * 运动：叶绿素由内向外沿扇形铺开、边缘沿弧同时扩张；命中叶屑在目标处炸开；枯叶在施法者身上垂直下落。
 * 数：`data.motes`（特攻与体重派生）决定扇形密度与落叶量，`data.intensity`（威力 / 150）抬高亮度与密度，
 * `data.ratio`（离中心的距离比例）让命中的爆开随远近增减，`data.cost`（自损比例）决定枯叶的密集程度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ChloroblastDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "core", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.18, 0.04], sizeMode: "sin",
                    color: 0xA8D95B, alpha: [0.65, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "leaves_in", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 13], size: [0.12, 0.03],
                    color: 0x8FBF3A, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "ground", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.05, 0.02],
                    color: 0xCBD9A6, alpha: [0.4, 0], light: "world", maxParticles: 36
                }
            ]
        },
        release: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "fan_fill", bind: "path", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    shape: { kind: "polygon" },
                    rate: { data: "motes", fallback: 40 }, direction: "shape", speed: [0.05, 0.24],
                    lifetime: [5, 11], size: [0.16, 0.04], sizeMode: "index",
                    color: 0x9CCB44, alpha: [0.6, 0], light: "world", maxParticles: 360
                },
                {
                    name: "fan_glow", bind: "path", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    shape: { kind: "polygon" },
                    rate: { data: "flow", fallback: 70 }, direction: "shape", speed: [0.03, 0.18],
                    lifetime: [6, 12], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xCDE985, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 260
                },
                {
                    name: "fan_edge", bind: "path", offset: [0, 0.55, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "motes", fallback: 40 }, direction: "shape", spread: 12, speed: [0.06, 0.26],
                    lifetime: [5, 11], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xD7E86B, alpha: [0.8, 0], light: "world", maxParticles: 220
                },
                {
                    name: "muzzle", bind: "source", offset: [0, 0.65, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.07, 0.24], spread: 22,
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF7B0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "motes", fallback: 40 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.07, 0.26], spread: 24,
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xEAF7B0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 160
                },
                {
                    name: "leafshower", bind: "target", offset: [0, 0.6, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "count", fallback: 20 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x8FBF3A, alpha: [0.7, 0], light: "world", maxParticles: 140
                }
            ]
        },
        wither: {
            duration: 34,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "dry_leaves", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "count", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.42 },
                    direction: "down", speed: [0.04, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xB9A94E, alpha: [0.65, 0], light: "world", maxParticles: 120
                },
                {
                    name: "dry_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xC7CE9A, alpha: [0.4, 0], light: "world"
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: { data: "motes", fallback: 40 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.04, drag: 0.92,
                    lifetime: [9, 16], size: [0.1, 0.02],
                    color: 0x9CB86A, alpha: [0.4, 0], light: "world", maxParticles: 70
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_chloroblast", 1, ChloroblastDefinition);
