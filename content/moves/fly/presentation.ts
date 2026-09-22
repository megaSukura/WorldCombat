/**
 * 飞翔 / Fly 的粒子语言。
 *
 * 一句话：蹲身一压 → 一股亮风把人笔直托上天空（柱子高度就是它飞多高）→ 空中悬停时地面上一直画着
 * 落点准星与一道淡淡的下落视线 → 整只鸟沿视线直坠下来，砸地时炸开一圈金白的风环与尘。
 *
 * 色相家族：暖日光白（0xF2E2B0）作主体与准星，纯白（0xFFFFFF）只给起降闪，尘用中性浅褐（0xC8B088）。
 * 与同族的勇鸟猛攻分开：这里是“竖直上升→竖直下落”，靠竖直风柱与地面准星读，不是低空斜掠。
 * 拍子：起 crouch（12t）→ 升 rise（30t）→ 持 mark（悬停，逐刻续期）→ 击 dive+impact/slam（30–34t）→ 收 whiff / blocked。
 *
 * 范围：mark 的地环就是落点与判定范围，slam 的风环再按定点击落的大范围放大；两者都绑 point，
 * 随 data.scale 缩放到真实半径。运动：rise 的风向上抽，dive 的速度线沿施法者实际下落方向（orient: velocity）。
 * 机制驱动：`data.climb`（实际飞行高度）决定 rise 风柱与 mark 视线的长度，`data.scale`（落地半径 / 0.9）
 * 决定准星与冲击环大小，`data.intensity`（命中数与高度系数）抬高冲击密度，`data.height`（高度系数）压低低跳的亮度。
 */
const FlyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 起：蹲身，脚边向内收的风与尘。
        crouch: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "crouch_gust", bind: "source", offset: [0, 0.45, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 16, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0xF2E2B0, alpha: [0.55, 0], light: "full", maxParticles: 40
                },
                {
                    name: "crouch_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0xC8B088, alpha: [0.45, 0], light: "world", maxParticles: 34
                }
            ]
        },
        // 升：竖直向上的风柱，长度就是飞了多高；速度线向下掠过，读得出“正在上升”。
        rise: {
            duration: 34,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    // fit "none" so the column length is exactly data.climb, not the body-scaled shape a source bind would give.
                    name: "rise_column", bind: "source", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 24, interval: 4, repeats: 2 },
                    shape: { kind: "cylinder", radius: 0.42, length: { data: "climb", fallback: 4.5 } },
                    direction: "up", speed: [0.1, 0.34],
                    lifetime: [8, 16], size: [0.24, 0.06],
                    color: 0xFFF6DC, alpha: [0.8, 0], light: "full", maxParticles: 120
                },
                {
                    name: "rise_lines", bind: "source", offset: [0, 0.35, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 30, shape: { kind: "box", size: [0.34, 0.3, 0.34] },
                    direction: "down", speed: [0.04, 0.18],
                    lifetime: [5, 10], size: [0.2, 0.06],
                    color: 0xEAF0FF, alpha: [0.6, 0], light: "full", maxParticles: 140
                },
                {
                    name: "rise_ground", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xC8B088, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        // 持：悬停时地面上的准星，加一道淡淡的下落视线；读得出“它会从这儿下来、还有多高”。
        mark: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "mark_ring", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 12, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.01, 0.03],
                    lifetime: [10, 16], size: [0.32, 0.1],
                    color: 0xF2E2B0, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "mark_sight", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "cylinder", radius: 0.16, length: { data: "climb", fallback: 4.5 } },
                    direction: "up", speed: [0, 0.01],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFF6DC, alpha: [0.28, 0], light: "full", maxParticles: 40
                }
            ]
        },
        // 击：俯冲。速度线沿实际下落方向，身后拖尾巴风。
        dive: {
            duration: 30,
            exit: { stop: 22, drain: 12 },
            emitters: [
                {
                    name: "dive_lines", bind: "source", offset: [0, 0.5, 0], height: 0.35, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 48, shape: { kind: "box", size: [0.3, 0.24, 0.3] },
                    direction: "shape", speed: [0.03, 0.12], trail: { minDistance: 0.18 },
                    lifetime: [5, 10], size: [0.2, 0.06],
                    color: 0xFFF6DC, alpha: [0.75, 0], light: "full", maxParticles: 240
                },
                {
                    name: "dive_wake", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    rate: 22, shape: { kind: "box", size: [0.55, 0.2, 0.55] },
                    direction: "away", speed: [0.04, 0.16], spread: 20,
                    lifetime: [8, 16], size: [0.3, 0.1], sizeMode: "sin",
                    color: 0xE8DFC0, alpha: [0.4, 0], light: "world", maxParticles: 130
                }
            ]
        },
        // 击（追踪俯冲）：命中一点。
        impact: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "impact_core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: 18, at: 1 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.06, 0.26],
                    lifetime: [7, 12], size: [0.38, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "impact_wind", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 36 }, shape: { kind: "hemisphere", radius: 0.5, rotation: [180, 0, 0] },
                    direction: "down", speed: [0.08, 0.3], spread: 18,
                    lifetime: [8, 16], size: [0.24, 0.06],
                    color: 0xF2E2B0, alpha: [0.7, 0], light: "world", maxParticles: 150
                },
                {
                    name: "impact_dust", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 26 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.03, drag: 0.95,
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0xC8B088, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        // 击（定点击落）：落点范围内的重压。
        slam: {
            duration: 34,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "slam_ring", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    // Authored 0.9 is the server's landing reference (reach / 0.9), so the outer ring equals the real pinned radius.
                    burst: { count: 3, interval: 3 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.24, 0.4],
                    lifetime: [14, 22], size: [0.5, 1.2],
                    color: 0xF2E2B0, alpha: [0.7, 0], light: "full"
                },
                {
                    name: "slam_dust", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 40, interval: 2, repeats: 2 }, shape: { kind: "circle", radius: 0.85, thickness: 0.3 },
                    direction: "outward", speed: [0.08, 0.28], gravity: 0.02, drag: 0.94,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xC8B088, alpha: [0.5, 0], light: "world", maxParticles: 180
                },
                {
                    name: "slam_debris", bind: "point", offset: [0, 0.2, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 14 }, shape: { kind: "circle", radius: 0.7 },
                    direction: "up", speed: [0.1, 0.26], gravity: 0.06, spin: 60,
                    lifetime: [14, 28], size: [0.12, 0.03],
                    color: 0xA08E72, alpha: [0.8, 0], light: "world", maxParticles: 50
                },
                {
                    name: "slam_smoke", bind: "point", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, interval: 3, repeats: 2 }, shape: { kind: "circle", radius: 0.6 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [18, 30], size: [0.28, 0.42],
                    color: 0xB8A98C, alpha: [0.35, 0], light: "world", maxParticles: 70
                }
            ]
        },
        // 收：撞在屋檐/树上，尘土一撮。
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blocked_dust", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.18], gravity: 0.08, drag: 0.9,
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0xA08E72, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "blocked_puff", bind: "point", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [14, 26], size: [0.2, 0.3],
                    color: 0xB8A98C, alpha: [0.35, 0], light: "world", maxParticles: 30
                }
            ]
        },
        // 收：落到空处，一小圈散开的尘。
        whiff: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "whiff_dust", bind: "point", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.94,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xC8B088, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_fly", 1, FlyDefinition);
