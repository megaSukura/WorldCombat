/**
 * 木角 / hornleech 的客户端表现。
 *
 * 一句话：低头刨地、角上聚起绿光 → 贴着地面冲出去、脚下扬起一串尘土 → 角扎进对手，伤口处炸开草屑与角影，
 * 随即养分沿「对手→自身」被抽回施法者身上。
 *
 * 色相家族：木绿（0x6DA83A／0x4E7F26）与嫩白（0xDCE775），近白只给扎中核心与角影；无第二色相。
 * 拍子：起 windup（聚光刨地）→ 冲 charge（贴地冲刺）→ 扎 gore（命中峰值）／空 miss（刹停扬尘）→ 抽 sap（回流）。
 * 范围：gore 的环按 `data.scale`（角尖判定 / 0.42）铺开，charge 的尘迹沿施法者实际走过的方向铺开，
 *   玩家能直接从尘迹读出这一撞划过的路线。
 * 运动：charge 的粒子沿 `data.direction` 向外掠过；sap 的线发射器 orient=direction 沿「目标→自身」抽汁，
 *   path 把角与施法者连成实线；miss 在尽头刹出一圈尘。
 * 数：`data.motes`（贯穿威力与抽取比例换算）决定草屑、角影与汁点密度；`data.carried`（已扎中的目标数）
 *   让贯穿式扎到第几个从画面读出。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const HornLeechDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "horn_gather", bind: "source", height: 0.6, offset: [0, 0, 0.2],
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 12, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.08], spin: 30,
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0x6DA83A, alpha: [0.7, 0], light: "world", maxParticles: 34
                },
                {
                    name: "horn_glow", bind: "source", height: 0.55, offset: [0, 0, 0.25],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.18 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [6, 11], size: [0.08, 0.01],
                    color: 0xDCE775, alpha: [0.85, 0], light: "full", maxParticles: 24
                }
            ]
        },
        charge: {
            duration: 24,
            exit: { stop: 18, drain: 12 },
            emitters: [
                {
                    name: "turfdust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 34, trail: { minDistance: 0.24 },
                    shape: { kind: "point" }, direction: "outward", speed: [0.03, 0.12], gravity: 0.03, drag: 0.93,
                    lifetime: [7, 14], size: [0.08, 0.02],
                    color: 0x9BB06A, alpha: [0.55, 0], light: "world", maxParticles: 150
                },
                {
                    name: "leaf_streak", bind: "source", height: 0.5, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    rate: 24, shape: { kind: "line", length: 0.6 },
                    direction: "shape", speed: [0.06, 0.20], spin: 50,
                    lifetime: [4, 9], size: [0.14, 0.04],
                    color: 0x6DA83A, alpha: [0.6, 0], light: "world", maxParticles: 120
                }
            ]
        },
        gore: {
            duration: 24,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "gore_core", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: 8, size: [0.38, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "horn_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/razorleaf",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.07, 0.26], spin: 60, gravity: 0.02, drag: 0.93,
                    lifetime: [7, 14], size: [0.14, 0.04],
                    color: 0x4E7F26, alpha: [0.85, 0], light: "world", maxParticles: 80
                },
                {
                    name: "wound_glow", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.10],
                    lifetime: [8, 16], size: [0.12, 0.02],
                    color: 0xDCE775, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 24
                },
                {
                    name: "gore_marks", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "carried", fallback: 1 }, at: 2 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.10, 0.02],
                    color: 0xDCE775, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 12
                }
            ]
        },
        sap: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "link", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    shape: { kind: "polyline" }, rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.01, 0.05], spread: 12,
                    lifetime: [8, 16], size: [0.10, 0.02], sizeMode: "index",
                    color: 0x4E7F26, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "flow", bind: "point", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "line", length: { data: "span", fallback: 3 } },
                    rate: { data: "motes", fallback: 14 },
                    direction: "shape", speed: [0.12, 0.34], spread: 10,
                    lifetime: [6, 14], size: [0.08, 0.01],
                    color: 0xDCE775, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 80
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "skid", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.4, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.04, drag: 0.93,
                    lifetime: [8, 15], size: [0.08, 0.02],
                    color: 0x9BB06A, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hornleech", 1, HornLeechDefinition);
