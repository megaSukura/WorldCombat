/**
 * 弹跳 / bounce 的粒子语言。
 *
 * 一句话：蹲身把地面压出一圈向内收的尘 → 一股亮风把人笔直弹上空中（柱子高度就是它弹多高）→ 最高点
 * 地面画着落点准星、头顶悬着一点余风 → 整只身体沿落点斜坠下去，砸地时炸开一圈金白的冲击环与尘，
 * 命中带电时再炸出几缕麻电火花。
 *
 * 色相家族：暖跳金（0xFFD86A）作主体与准星，米白（0xFFF6DC）只给起落闪，尘用中性浅褐（0xC8B088），
 * 麻电用偏白的电光黄（0xFFF3A0）。与同族的飞翔分开：这里是「原地竖直弹起 → 沿落点斜坠」，靠压缩的地面环
 * 与斜坠速度线读，不是高空横掠再加竖直俯冲。
 * 拍子：起 crouch（14t）→ 弹 rise（30t）→ 持 mark／hang（悬停，逐刻续期）→ 坠 fall（26t）→ 击 impact／whiff（30–40t）→ 收 rebound。
 *
 * 范围：mark 的地环就画在起跳锁死的地面落点上（点实体锚它脚下、点世界点投到那片地面），impact 的冲击环再按落地半径放大；
 * 两者都绑 point，随 data.scale 缩放到真实半径，impact 也只在真实落地点播放。
 * 运动：rise／hang 跟本体，fall 的速度线沿施法者实际坠落方向（orient: velocity），rebound 的风向上收尾。
 * 机制驱动：`data.climb`（实际弹跳高度）决定 rise 风柱与 mark 视线的长度，`data.scale`（落地半径 / 0.9）
 * 决定准星与冲击环大小，`data.height`（高度系数）压低低跳的亮度，`data.intensity`（命中数 + 麻痹数）抬高冲击密度，
 * `data.sparks`（麻痹命中的电火数）决定麻电火花的数量。
 */
const BounceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 起：蹲身压地，脚边向内收的风与尘。
        crouch: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "crouch_gust", bind: "source", offset: [0, 0.42, 0], height: 0.32,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 16, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.14, 0.04], sizeMode: "sin",
                    color: 0xFFD86A, alpha: [0.55, 0], light: "full", maxParticles: 40
                },
                {
                    name: "crouch_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.05, 0.02],
                    color: 0xC8B088, alpha: [0.45, 0], light: "world", maxParticles: 34
                }
            ]
        },
        // 弹：竖直向上的风柱，长度就是弹了多高；速度线向下掠过，读得出「正在弹起」。
        rise: {
            duration: 32,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    // fit "none" so the column length is exactly data.climb, not the body-scaled shape a source bind would give.
                    name: "rise_column", bind: "source", fit: "none", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 26, interval: 4, repeats: 2 },
                    shape: { kind: "cylinder", radius: 0.42, length: { data: "climb", fallback: 3.2 } },
                    direction: "up", speed: [0.1, 0.34],
                    lifetime: [8, 16], size: [0.24, 0.06],
                    color: 0xFFF6DC, alpha: [0.8, 0], light: "full", maxParticles: 120
                },
                {
                    name: "rise_lines", bind: "source", offset: [0, 0.35, 0], height: 0.36,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 28, shape: { kind: "box", size: [0.32, 0.28, 0.32] },
                    direction: "down", speed: [0.04, 0.18],
                    lifetime: [5, 10], size: [0.2, 0.06],
                    color: 0xFFF3D0, alpha: [0.6, 0], light: "full", maxParticles: 130
                },
                {
                    name: "rise_ground", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.48 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xC8B088, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        // 持（落点）：地面上的准星，读得出「它会从这儿下来、还有多高」。
        mark: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "mark_ring", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 12, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.01, 0.03],
                    lifetime: [10, 16], size: [0.3, 0.1],
                    color: 0xFFD86A, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "mark_sight", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "cylinder", radius: 0.16, length: { data: "climb", fallback: 3.2 } },
                    direction: "up", speed: [0, 0.01],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0xFFF6DC, alpha: [0.26, 0], light: "full", maxParticles: 40
                }
            ]
        },
        // 持（最高点）：悬停时头顶一点余风，读得出「还停在空中」。
        hang: {
            duration: 10,
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "hang_gust", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    rate: 14, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xFFF6DC, alpha: [0.4, 0], light: "full", maxParticles: 36
                }
            ]
        },
        // 坠：沿落点斜坠。速度线沿实际坠落方向，身后拖尾巴风。
        fall: {
            duration: 26,
            exit: { stop: 20, drain: 12 },
            emitters: [
                {
                    name: "fall_lines", bind: "source", offset: [0, 0.45, 0], height: 0.32, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 46, shape: { kind: "box", size: [0.3, 0.22, 0.3] },
                    direction: "shape", speed: [0.03, 0.12], trail: { minDistance: 0.18 },
                    lifetime: [5, 10], size: [0.2, 0.06],
                    color: 0xFFF3D0, alpha: [0.75, 0], light: "full", maxParticles: 220
                },
                {
                    name: "fall_wake", bind: "source", offset: [0, 0.45, 0], height: 0.38,
                    particle: "world_combat_core:cobblemon/vanilla/gust",
                    rate: 20, shape: { kind: "box", size: [0.5, 0.2, 0.5] },
                    direction: "away", speed: [0.04, 0.16], spread: 20,
                    lifetime: [8, 16], size: [0.28, 0.1], sizeMode: "sin",
                    color: 0xEEDCB0, alpha: [0.38, 0], light: "world", maxParticles: 120
                }
            ]
        },
        // 击：落地冲击。地面环的半径就是判定范围，命中越重越亮；麻电火花按 data.sparks 追加。
        impact: {
            duration: 32,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "impact_ring", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 3, interval: 2 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.22, 0.4],
                    lifetime: [14, 22], size: [0.45, 1.1],
                    color: 0xFFD86A, alpha: [0.7, 0], light: "full"
                },
                {
                    name: "impact_core", bind: "point", offset: [0, 0.25, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: 20, at: 1 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF6DC, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "impact_dust", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 28, interval: 2, repeats: 2 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.03, drag: 0.94,
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0xC8B088, alpha: [0.5, 0], light: "world", maxParticles: 120
                },
                {
                    name: "impact_debris", bind: "point", offset: [0, 0.16, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 12 }, shape: { kind: "circle", radius: 0.5 },
                    direction: "up", speed: [0.1, 0.24], gravity: 0.06, spin: 60,
                    lifetime: [14, 26], size: [0.12, 0.03],
                    color: 0xA08E72, alpha: [0.8, 0], light: "world", maxParticles: 50
                },
                {
                    name: "impact_spark", bind: "point", offset: [0, 0.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/status/paralysis_spark",
                    burst: { count: { data: "sparks", fallback: 0 } }, shape: { kind: "sphere", radius: 0.42 },
                    direction: "outward", speed: [0.08, 0.26],
                    lifetime: [8, 16], size: [0.22, 0.04],
                    color: 0xFFF3A0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 90
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
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.03, drag: 0.94,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0xC8B088, alpha: [0.4, 0], light: "world", maxParticles: 50
                }
            ]
        },
        // 收：落地后向上回弹的一小口气。
        rebound: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "rebound_gust", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/vanilla/small_gust",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.06, 0.18],
                    lifetime: [8, 14], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xFFD86A, alpha: [0.5, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bounce", 1, BounceDefinition);
