/**
 * 愤怒粉 / Rage Powder 的粒子语言。
 *
 * 一句话：抖一抖身子把粉抖开（windup）→ 粉尘落到选定的近地、炸开成一小团（burst）→ 一团黄绿的粉尘**固定**铺在那里、
 *   缓缓打转（cloud）→ 有人踩进来时粉尘向里一收、并从那个人牵出一条短线连向施术者（draw）→ 时间到了粉尘落定散去（fade）。
 * 色相家族：粉尘黄绿 0xC8D97A 为主体，近白 0xEEF3C8 做高光，暗橄榄 0x6E7A3A 做云底；draw 的连线用暗橄榄，跟云底同族。
 * 拍子：起 windup 0–12t ／ 炸 burst 0–28t ／ 云 cloud（持续，绑在云效果上，离施法者距离无关）／ 吸 draw 0–26t（每有入云者一次）／ 收 fade 0–26t。
 * 范围：burst／cloud／fade 都画在 `data.centre` 的真实云中心，圆盘半径直接绑 `data.radius`（服务端算出的粉尘半径），画面画到哪云就罩到哪；
 *   draw 用 `data.path` 从真正入云者连向施术者（可能已走远），实体顶点逐帧跟随。
 * 运动：粉尘落地外扩、贴地打转、入云时向里一收；到期整体下沉淡去。
 * 数：粉尘颗粒数绑 `data.motes`（特攻派生），云里可牵引的生物数由 `data.lured` 提高强度。
 * 说明：持续状态故意有些遮挡，视线让给「云里」这个机制本身；密度刻意压低，玩家仍看得清目标和战场。
 */
const RagePowderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "shake", bind: "source", offset: [0, 0.6, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 10, interval: 3 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xC8D97A, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.2, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.05, 0.01],
                    color: 0xEEF3C8, alpha: [0.5, 0], light: "world", maxParticles: 26
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "land", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "motes", fallback: 24 }, interval: 2, repeats: 2 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.16], spread: 60, drag: 0.9, gravity: 0.004,
                    lifetime: [14, 24], size: [0.14, 0.04], spin: 16,
                    color: 0xC8D97A, alpha: [0.8, 0], light: "world", maxParticles: 90
                },
                {
                    name: "land_ring", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 12 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [12, 20], size: [0.2, 0.08],
                    color: 0x6E7A3A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        cloud: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "haze", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 26, shape: { kind: "circle", radius: { data: "radius", fallback: 1 } },
                    direction: "up", speed: [0.004, 0.02], spin: 4,
                    lifetime: [18, 32], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xC8D97A, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 110
                },
                {
                    name: "floor", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 4, shape: { kind: "circle", radius: { data: "radius", fallback: 1 }, thickness: 0.85 },
                    direction: "outward", speed: [0.006, 0.022],
                    lifetime: [18, 30], size: [0.16, 0.04],
                    color: 0x6E7A3A, alpha: [0.3, 0.02], alphaMode: "sin", light: "world", maxParticles: 24
                },
                {
                    name: "motes", bind: "point", offset: [0, 0.35, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "motes", fallback: 24 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1 } },
                    direction: "up", speed: [0.006, 0.024], spin: 8,
                    lifetime: [14, 26], size: [0.07, 0.01], sizeMode: "sin",
                    color: 0xEEF3C8, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 70
                }
            ]
        },
        draw: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "tie", bind: "path", offset: [0, 0.6, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    shape: { kind: "polyline" },
                    rate: { data: "lured", fallback: 1 }, direction: "shape", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0x6E7A3A, alpha: [0.5, 0], light: "world", maxParticles: 34
                },
                {
                    name: "tie_mote", bind: "path", offset: [0, 0.6, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    shape: { kind: "polyline" },
                    rate: 8, direction: "shape", speed: [0.01, 0.05],
                    lifetime: [5, 9], size: [0.05, 0.015],
                    color: 0xEEF3C8, alpha: [0.45, 0], light: "world", maxParticles: 24
                },
                {
                    name: "caught", bind: "target", offset: [0, 0.35, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 6 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xC8D97A, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "settle", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20, interval: 4, repeats: 2 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1 } },
                    direction: "down", speed: [0.01, 0.05], gravity: 0.01, drag: 0.96,
                    lifetime: [16, 28], size: [0.06, 0.01],
                    color: 0x6E7A3A, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "last_puff", bind: "point", offset: [0, 0.4, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    burst: { count: 8 }, shape: { kind: "circle", radius: { data: "radius", fallback: 1 } },
                    direction: "up", speed: [0.02, 0.06], drag: 0.93,
                    lifetime: [14, 24], size: [0.12, 0.03],
                    color: 0xC8D97A, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_ragepowder", 1, RagePowderDefinition);
