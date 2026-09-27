/**
 * 妒火 / burningjealousy 的粒子语言。
 *
 * 一句话：施法者身前的空气先泛起一层妒绿的火星、向张角两侧收拢 → 一整片妒绿的扇面火焰瞬时贴着地面亮起、
 * 火舌向上抽进被判定的高度带，被墙截短处画面同样在墙面停下 → 正带着强化、且真的被点燃的目标身上炸开一圈
 * 更亮的绿火并缠上妒火，没有咬上的目标不显示缠火。
 *
 * 色相家族：妒绿（0x6FD08A）作主体与扇面，米绿（0xEAF7E0）只给强化目标的点火强调，
 * 余韵用暗绿烟（0x2E5A3A）。这个绿就是「嫉妒」的身份，不是普通火招的橙。
 * 拍子：起 charge（12t）→ 喷 wave（18t，一次性整片亮起）→ 击 hit（24t，逐目标）→ 收。
 *
 * 范围：wave 的发射器绑 `data.path`（服务端 burningJealousyFan 逐射线按真实墙面截短的扇面顶点），
 * 用 polygon 填满整片判定区域、polyline 描出被墙截短的边界；玩家一眼知道站在扇形里会被烧到。
 * 运动：火舌向上抽、整片同时亮起，不向外推进；扇形随 path 顶点逐帧固定在世界上。
 * 机制驱动：`data.motes`（特攻派生的火点数）决定 wave 的密度，`data.intensity`（命中总级数与人数派生）
 * 决定亮度；逐目标的 `data.gnaw`（灼伤目标的正等级）只在真的咬上时驱动 hit 的缠火。
 */
const BurningJealousyDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        // 起：身前聚火，绿星向内收拢。
        charge: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "charge_sparks", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 26, shape: { kind: "sphere", radius: 0.44 },
                    direction: "inward", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0x6FD08A, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "charge_ember", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.16, 0.04],
                    color: 0x9BE8A8, alpha: [0.4, 0], light: "full", maxParticles: 40
                }
            ]
        },
        // 喷：整片扇面火舌同时亮起，顶点就是判定区域；火舌向上抽进被判定的高度带，不向外推进。
        wave: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wave_fill", bind: "path", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/vanilla/flame",
                    burst: { count: { data: "motes", fallback: 28 }, at: 1 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.05, 0.22],
                    lifetime: [8, 16], size: [0.32, 0.06], sizeMode: "sin",
                    color: 0x6FD08A, alpha: [0.85, 0], light: "full", maxParticles: 260
                },
                {
                    name: "wave_body", bind: "path", offset: [0, 1.2, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "motes", fallback: 20 }, at: 1 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.06, 0.24],
                    lifetime: [8, 16], size: [0.24, 0.05],
                    color: 0x9BE8A8, alpha: [0.55, 0], light: "full", maxParticles: 180
                },
                {
                    name: "wave_edge", bind: "path", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 40, at: 1 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xEAF7E0, alpha: [0.75, 0], light: "full", maxParticles: 160
                },
                {
                    name: "wave_smoke", bind: "point", fit: "none", offset: [0, 0.12, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 16, interval: 4, repeats: 2 }, shape: { kind: "circle", radius: 0.8 },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [16, 30], size: [0.3, 0.46],
                    color: 0x2E5A3A, alpha: [0.3, 0], light: "world", maxParticles: 70
                }
            ]
        },
        // 击：被咬住的目标身上炸开一圈更亮的绿火。
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 14, at: 1 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [7, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xEAF7E0, alpha: [1, 0], light: "full", bloom: 0.5
                },
                {
                    name: "hit_gnaw", bind: "target", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "gnaw", fallback: 0 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.06, 0.22],
                    lifetime: [10, 20], size: [0.24, 0.06],
                    color: 0x6FD08A, alpha: [0.85, 0], light: "full", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_burningjealousy", 1, BurningJealousyDefinition);
