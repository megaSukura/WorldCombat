/**
 * 尖刺臂 / needlearm 的客户端表现。
 *
 * 一句话：施法者压低身子、臂上拢起一小丛尖刺，随后短扑一步，带刺的手臂从右到左抡过一大片扇形；
 *   扫过的每一段都亮起一层叶与刺，扫到的人身上迸出草屑。
 * 色相家族：草绿与叶黄（razorleaf / smallleaf / seed / impact_grass 为主体，0x8FC63A、0xB6D84A），近白只给命中那一闪。
 * 拍子：起（coil 拢刺）→ 扑（drive 扑上）→ 扫（rake 三段真实扇面从右到左）→ 中（strike 命中迸刺）→ 懵（flinch）／空（miss）。
 * 范围：rake 的三段各自绑服务端传来的 `data.path`（与 WorldGeometry.sector 同一组顶点），弧面盖到哪就是扫到哪；
 *   `data.scale`（挥扫半径 / 参考值）缩放粒子，`data.intensity` 抬高亮度。
 * 运动：起手尖刺向臂上收拢；扑上时向前拖叶；每段扇面沿弧由内向外扫开；命中时朝外迸刺。
 * 数：`data.thorns`（物攻与等级派生）决定每段扇面的密度与命中迸刺量。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const NeedlearmDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "coil_thorns", bind: "source", offset: [0, 0.4, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    rate: 20, shape: { kind: "sphere", radius: 0.5 }, direction: "inward", speed: [0.04, 0.16], spread: 14,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xB6D84A, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "coil_leaf", bind: "source", offset: [0, 0.5, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 10, shape: { kind: "sphere", radius: 0.6 }, direction: "inward", speed: [0.02, 0.1], spread: 12,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x8FC63A, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        drive: {
            duration: 16,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "drive_leaf", bind: "source", offset: [0, 0.4, 0], height: 0.5, fit: "body",
                    trail: { minDistance: 0.18 },
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: { data: "thorns", fallback: 22 }, shape: { kind: "sphere", radius: 0.18 }, direction: "outward", speed: [0.02, 0.1], spread: 12, spin: 12,
                    lifetime: [7, 13], size: [0.12, 0.02],
                    color: 0x8FC63A, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        },
        rake: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "rake_fill", bind: "path", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    rate: { data: "thorns", fallback: 22 }, shape: { kind: "polygon" }, direction: "shape", speed: [0.06, 0.24], spread: 16, spin: 14,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0x8FC63A, alpha: [0.4, 0], light: "world", maxParticles: 110
                },
                {
                    name: "rake_edge", bind: "path", offset: [0, 0.16, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 26, shape: { kind: "polyline" }, direction: "shape", speed: [0.08, 0.3], spread: 12,
                    lifetime: [6, 11], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xB6D84A, alpha: [0.75, 0], light: "world", maxParticles: 90
                },
                {
                    name: "rake_thorns", bind: "path", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    rate: 18, shape: { kind: "polygon" }, direction: "shape", speed: [0.05, 0.18], gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x7FB03A, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        strike: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "strike_burst", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "thorns", fallback: 22 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.12, 0.5], spread: 24,
                    lifetime: [7, 13], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "strike_thorns", bind: "target", offset: [0, 0.05, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: { data: "thorns", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.3 }, direction: "outward", speed: [0.15, 0.5], spread: 26,
                    gravity: 0.04, drag: 0.94,
                    lifetime: [10, 20], size: [0.11, 0.02],
                    color: 0xB6D84A, alpha: [0.8, 0], light: "world", maxParticles: 60
                }
            ]
        },
        flinch: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "daze", bind: "target", offset: [0, 0, 0], height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10, at: 0, interval: 2, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "outward", speed: [0.02, 0.1], spread: 20,
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0xD8F0A0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "miss_leaf", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.04, 0.16], spread: 18,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0x8FC63A, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_needlearm", 1, NeedlearmDefinition);
