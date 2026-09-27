/**
 * 飞叶快刀 / razorleaf 的客户端表现。
 *
 * 一句话：施法者身侧的叶排成一列、边缘亮起，随后一波波锋利的叶顺着瞄准方向真实向前推进，每波是一堵
 * **填满真实幕宽与高度带**的叶墙；撞到实墙的那一堵停在接触面前，削中目标时爆开一团叶屑。
 * 色相家族：草绿与浅黄绿（razorleaf／smallleaf／impact_grass），近白叶光（impact_grass_white／white）只给暴击那一下。
 * 拍子：起（gather 排叶）→ 发（sweep 每波叶墙沿窄带逐段推进）→ 中（cut 命中爆叶屑）→ 强调（crit）。
 * 范围：sweep 的 `data.path` 是服务端这一小段真实位移处的叶墙四角（下左、下右、上右、上左），
 *   `polygon` 把整堵幕填满 `data.spread` 宽的横向范围与判定同一高度带；服务端用 `WorldGeometry.bodyLane`
 *   沿同一段位移判定，命中只发生在叶幕真正经过时。撞墙/飞尽的最后一段由服务端单独发一次，不会提前消失。
 * 运动：gather 的叶向一条线收拢；sweep 的叶填满当刻叶墙、沿 `data.path` 推进；cut 时叶屑向外炸。
 * 数：`data.leaves`（速度派生）决定每波叶墙的密度与命中爆开的叶量，`data.leafRadius`（体型派生）决定单叶厚度，
 * `data.wave`/`data.waves` 让第几波可读，`data.intensity` 抬高亮度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const RazorleafDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather_leaves", bind: "source", offset: [0, 0.5, 0.2], height: 0.4, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 22, shape: { kind: "line", length: 0.9, rotation: [0, 0, 90] },
                    direction: "inward", speed: [0.04, 0.16], spread: 14, spin: 18,
                    lifetime: [8, 15], size: [0.13, 0.03],
                    color: 0xBFE6A0, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        sweep: {
            duration: 40,
            exit: { stop: 18, drain: 14 },
            emitters: [
                {
                    name: "lane_wall", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: { data: "leaves", fallback: 12 }, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.25, 0.6], spread: 6, spin: 26, sizeMode: "index",
                    lifetime: [6, 12], size: [{ data: "leafRadius", fallback: 0.26 }, 0.04],
                    color: 0xD8F0A8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 140
                },
                {
                    name: "lane_rim", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 22, shape: { kind: "polyline", closed: true },
                    direction: "shape", speed: [0.12, 0.36], spread: 8, spin: 20, sizeMode: "index",
                    lifetime: [9, 16], size: [0.16, 0.02],
                    color: 0x9ED070, alpha: [0.45, 0], light: "world", maxParticles: 100
                }
            ]
        },
        cut: {
            duration: 18,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "cut_burst", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "leaves", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 }, direction: "outward", speed: [0.08, 0.3], spread: 24,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xE8F7C0, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "cut_leaf", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 10, at: 1 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.4], spread: 26, gravity: 0.04, drag: 0.9, spin: 22,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x8FBE5C, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        crit: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "vital_flash", bind: "point", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass_white",
                    burst: { count: { data: "leaves", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 }, direction: "outward", speed: [0.1, 0.36], spread: 28,
                    lifetime: [7, 13], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 14,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "miss_leaves", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke_white",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.12], spread: 16, gravity: 0.02, drag: 0.9,
                    lifetime: [10, 16], size: [0.14, 0.02],
                    color: 0xB8CFA0, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_razorleaf", 1, RazorleafDefinition);
