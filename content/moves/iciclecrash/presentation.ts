/**
 * 冰柱坠击 / iciclecrash 的客户端表现。
 *
 * 一句话：目标头顶亮起一片落点记号，一根巨大的冰柱从高处垂直砸下、拖着一路冰雪，落地时碎冰向四周炸开、
 * 贴地铺一圈霜，被砸懵的人头上晃星。
 * 色相家族：冰青（0x9FD8E8）与近白（0xDFF6FF）为主，深青（0x6FB8D0）只在碎冰上出现。
 * 拍子：起（windup 聚寒气、mark 落点记号）→ 击（fall 垂直坠落、shatter 落地碎冰）→ 收（hit 命中、flinch 砸懵）。
 * 范围：mark 与 shatter 的地面圈按 `data.scale`（碎裂半径 / 1.7）铺开，画出的就是会被扫到的那圈；落点即柱尖垂线足点。
 * 运动：冰柱绑 projectile 沿竖直方向落下并拖着冰尘；碎冰向四周带重力外抛，落地后不再有持续冰场。
 * 数：`data.count`（碎冰威力派生）决定立起的冰柱与碎冰量，`data.height`（实际落高，已被顶棚截短）标注柱高。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const IciclecrashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "chill", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 20, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.1, 0.03],
                    color: 0xBFE8F2, alpha: [0.6, 0], light: "world", maxParticles: 70
                },
                {
                    name: "breath", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 12, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xDFF6FF, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        mark: {
            duration: 30,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "aim", bind: "point", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    rate: 6, shape: { kind: "ring", radius: 1.7 },
                    direction: "outward", speed: [0.01, 0.06],
                    lifetime: [12, 20], size: [0.5, 1.0], sizeMode: "sin",
                    color: 0x9FD8E8, alpha: [0.4, 0], light: "world", maxParticles: 60
                },
                {
                    name: "shiver", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 26, shape: { kind: "ring", radius: 1.7 },
                    direction: "inward", speed: [0.02, 0.1],
                    gravity: -0.006, drag: 0.94,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xBFE8F2, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "beckon", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 14, shape: { kind: "ring", radius: 1.7 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.14, 0.03],
                    color: 0xDFF6FF, alpha: [0.65, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        fall: {
            duration: 80,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "quill", bind: "projectile",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 54, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.12], trail: { minDistance: 0.3 },
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xCFEEF6, alpha: [0.8, 0], light: "world", maxParticles: 220
                },
                {
                    name: "snow", bind: "projectile", offset: [0, -0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 30, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.01, 0.08],
                    gravity: 0.03, drag: 0.94,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xB8DEEA, alpha: [0.45, 0], light: "world", maxParticles: 120
                }
            ]
        },
        shatter: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "shatter", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "count", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.36], spread: 18,
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "shards", bind: "point", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "count", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.12, 0.46], spread: 34,
                    gravity: 0.07, drag: 0.94,
                    lifetime: [12, 22], size: [0.2, 0.04],
                    color: 0x9FD8E8, alpha: [0.95, 0], light: "world", maxParticles: 120
                },
                {
                    name: "frost_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "count", fallback: 16 }, at: 1 },
                    shape: { kind: "ring", radius: 1.7 },
                    direction: "outward", speed: [0.06, 0.26], spread: 12,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0xCFEEF6, alpha: [0.6, 0], light: "world", maxParticles: 130
                },
                {
                    name: "mist", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [16, 28], size: [0.24, 0.4],
                    color: 0xBFE0EA, alpha: [0.28, 0], light: "world", maxParticles: 50
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "count", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.08, 0.28], spread: 16,
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xEAFBFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "glaze", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "count", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.26],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xCFEEF6, alpha: [0.85, 0], light: "world", maxParticles: 90
                }
            ]
        },
        flinch: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "stagger", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [12, 18], size: [0.15, 0.04],
                    color: 0xEAFBFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "scuff", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16],
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0xBFE0EA, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_iciclecrash", 1, IciclecrashDefinition);
