/**
 * 悔念剑 / bitterblade 的客户端表现。
 *
 * 一句话：剑尖聚起暗红余烬、剑身压出一道火线 → 一趟火弧贴着身前扫过，弧面亮起刃光、命中的目标炸开火星 →
 *   伤口上的余烬沿「目标→自身」抽回剑身，剑上余火烧得更亮。
 *
 * 色相家族：暗红余烬（0xC23616／0x7A1E0C）与暖金（0xFFC46A）；近黑（0x2B1B22）只压在弧底作轮廓，无第二色相。
 * 拍子：起 windup（聚悔意）→ 斩 sweep（弧面扫过）→ 中 cut（每个目标一处峰值）→ 抽 regret（余烬回流）／空 miss（尽头散火）。
 * 范围：sweep 用 `data.path`（与服务端 WorldGeometry.sector 同一片扇形）铺成多边形，弧面盖到哪就是打到哪；
 *   `data.arc`／`data.reach` 让玩家读出弧的张角与长度。
 * 运动：弧面粒子沿扇形由剑根向外推、带切向散开；cut 的火星自命中点向外爆；regret 的线发射器沿 `data.direction` 把余烬抽回剑身。
 * 数：`data.motes`（斩击威力与汲取比例换算）决定刃光与火星密度，`data.hits`（弧内命中数）让扫中几个人从画面读出，
 *   `data.intensity` 随斩击威力抬升亮度——残血时这一剑视觉上明显更烈。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const BitterBladeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "regret_gather", bind: "source", height: 0.55, offset: [0, 0, 0.3],
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.09], spin: 30,
                    lifetime: [6, 12], size: [0.10, 0.02],
                    color: 0xC23616, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 36
                },
                {
                    name: "edge_line", bind: "source", height: 0.55, offset: [0, 0, 0.32],
                    particle: "world_combat_core:cobblemon/generic/sword",
                    rate: 6, shape: { kind: "line", length: 0.7 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.24, 0.02], sizeMode: "index",
                    color: 0xFFC46A, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 16
                }
            ]
        },
        sweep: {
            duration: 24,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "arc_fill", bind: "path", offset: [0, 0.16, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" },
                    rate: { data: "motes", fallback: 22 }, direction: "shape", speed: [0.02, 0.1],
                    lifetime: [7, 14], size: [0.34, 0.06],
                    color: 0xC23616, alpha: [0.3, 0], light: "full", maxParticles: 140
                },
                {
                    name: "arc_edge", bind: "path", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline", closed: true },
                    rate: 32, direction: "shape", speed: [0.05, 0.18], spread: 10,
                    lifetime: [5, 10], size: [0.28, 0.04], sizeMode: "index",
                    color: 0xFFC46A, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 120
                },
                {
                    name: "ash_base", bind: "path", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: 20, direction: "shape", speed: [0.03, 0.12], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0x2B1B22, alpha: [0.35, 0], light: "world", maxParticles: 70
                }
            ]
        },
        cut: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "cut_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [6, 10], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xFFC46A, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 8
                },
                {
                    name: "cut_embers", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.07, 0.26], spread: 24, spin: 40, gravity: 0.02, drag: 0.94,
                    lifetime: [7, 14], size: [0.16, 0.04],
                    color: 0xC23616, alpha: [0.9, 0], light: "full", maxParticles: 80
                },
                {
                    name: "cut_marks", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "hits", fallback: 1 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xFFC46A, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 10
                }
            ]
        },
        regret: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 16 },
                    direction: "shape", speed: [0.02, 0.09], spread: 10,
                    lifetime: [8, 15], size: [0.10, 0.02],
                    color: 0xC23616, alpha: [0.75, 0], light: "full", bloom: 0.2, maxParticles: 90
                },
                {
                    name: "flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "line", length: { data: "span", fallback: 3 } },
                    rate: { data: "motes", fallback: 16 },
                    direction: "shape", speed: [0.14, 0.36], spread: 9,
                    lifetime: [6, 13], size: [0.10, 0.01],
                    color: 0xFFC46A, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 80
                },
                {
                    name: "blade_grow", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: { data: "intensity", fallback: 1 },
                    shape: { kind: "sphere", radius: 0.2 }, direction: "inward", speed: [0.01, 0.05],
                    lifetime: [9, 15], size: [0.14, 0.01],
                    color: 0xFFC46A, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 26
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "scatter", bind: "point", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.04, drag: 0.92,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0xC23616, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bitterblade", 1, BitterBladeDefinition);
