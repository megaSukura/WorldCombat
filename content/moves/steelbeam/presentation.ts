/**
 * 铁蹄光线 / steelbeam 的客户端表现。
 *
 * 一句话：施法者把全身的钢片收进身前、铸成一根发白的钢梁射出去；梁命中处炸开一片钢花并把目标撞开，
 * 随后施法者身上崩下一层钢屑——画面直接告诉你这一记是拿自己的身体付的账。
 * 色相家族：冷钢白到浅青（speedlines／glowingsparkle_cyan 原色、impact_steel 亮帧、tinydust 中性），
 * 核心近白，钢屑用低饱和灰蓝。
 * 拍子：起 gather（收钢）→ 铸 lance（钢梁走廊，撞墙处截断）→ 撞 impact（命中钢花）／ 空 fizzle（尽头散光）／
 *   墙 wall（墙面迸屑）→ 剥 shed（落屑，只有真的扣血才散）。
 * 范围：lance 用 `data.path` 画出服务端走廊的同一组四个顶点——梁有多长多宽、被哪面墙截断，画面就是那条钢梁。
 * 运动：钢梁沿走廊由近及远铺开、边缘同时向前扫过；命中钢花在命中点炸开；落屑在施法者身上垂直下坠。
 * 数：`data.notes`（威力换算）与 `data.intensity`（威力 / 140）决定钢梁与命中钢花的密度，`data.shards`（体重与
 * 身高派生）决定边缘强调与落屑数量，`data.scale`（半宽 / 0.85）放大钢梁与冲击的尺寸；`data.drain`（自损比例派生）
 * 决定准备期从体表收走的金属光量，`data.count`（按实际失血）决定崩落的甲片数，`data.blocked`/`data.face` 标出撞墙。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SteelbeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "gather_core", bind: "source", offset: [0, 0.75, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 20, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xEDF6FF, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "gather_sparks", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 14, shape: { kind: "sphere", radius: 0.44 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [5, 11], size: [0.09, 0.02],
                    color: 0xBFE0FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "gather_ground", bind: "source", offset: [0, 0.02, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.05, 0.02],
                    color: 0xC3CDD5, alpha: [0.45, 0], light: "world", maxParticles: 36
                },
                {
                    name: "gather_peel", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "drain", fallback: 28 }, shape: { kind: "sphere_surface", radius: 0.46 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [5, 10], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xEAF5FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 90
                }
            ]
        },
        lance: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "lane_fill", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    shape: { kind: "polygon" },
                    rate: { data: "notes", fallback: 110 }, direction: "shape", speed: [0.04, 0.2],
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xDFF1FF, alpha: [0.55, 0], light: "full", maxParticles: 420
                },
                {
                    name: "lane_grit", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    shape: { kind: "polygon" },
                    rate: { data: "notes", fallback: 60 }, direction: "shape", speed: [0.03, 0.16],
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "index",
                    color: 0x9FC4E0, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 260
                },
                {
                    name: "lane_edge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: { data: "shards", fallback: 26 }, direction: "shape", spread: 10, speed: [0.06, 0.24],
                    lifetime: [5, 11], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xF6FCFF, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 220
                },
                {
                    name: "muzzle", bind: "source", offset: [0, 0.7, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "target", offset: [0, 0.55, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "shards", fallback: 26 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.06, 0.24], spread: 22,
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xF6FCFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 140
                },
                {
                    name: "shock", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 18, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 16], size: [0.32, 0.1],
                    color: 0xC6DAEA, alpha: [0.5, 0], light: "world"
                }
            ]
        },
        shed: {
            duration: 32,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "shed_fall", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "count", fallback: 26 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.04, 0.14], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xB9D2E6, alpha: [0.7, 0], light: "full", maxParticles: 140
                },
                {
                    name: "shed_ring", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 22, at: 0, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.5 } },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xC6DAEA, alpha: [0.45, 0], light: "world"
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 15], size: [0.18, 0.05],
                    color: 0xAEBEC9, alpha: [0.3, 0], light: "world", maxParticles: 50
                }
            ]
        },
        wall: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wall_grit", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "shards", fallback: 26 }, at: 0 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.24], spread: 30,
                    lifetime: [6, 12], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xEAF5FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "wall_dust", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 15], size: [0.1, 0.02],
                    color: 0xB9C6D2, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_steelbeam", 1, SteelbeamDefinition);
