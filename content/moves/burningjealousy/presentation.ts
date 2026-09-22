/**
 * 妒火 / burningjealousy 的粒子语言。
 *
 * 一句话：施法者身前的空气先泛起一层妒绿的火星、向张角两侧收拢 → 一整片妒绿的扇面火焰贴着地面铺开，
 * 火舌的高度随被点燃者涨高的级数抬起来 → 正带着强化的目标身上炸开一圈更亮的绿火，被妒火咬住。
 *
 * 色相家族：妒绿（0x6FD08A）作主体与扇面，米绿（0xEAF7E0）只给强化目标的点火强调，
 * 余韵用暗绿烟（0x2E5A3A）。这个绿就是「嫉妒」的身份，不是普通火招的橙。
 * 拍子：起 charge（12t）→ 喷 wave（30t）→ 击 hit（24t，逐目标）→ 收。
 *
 * 范围：wave 的发射器绑 `data.path`（服务端 burningJealousyFan 生成的扇面顶点），用 polygon 填满整片判定区域；
 * 玩家一眼知道站在扇形里会被烧到。
 * 运动：火舌向上抽、边缘向外推；扇形随 path 顶点逐帧固定在世界上。
 * 机制驱动：`data.motes`（特攻派生的火点数）与 `data.intensity` 决定 wave 的密度，`data.best`（命中目标里最高的
 * 正面等级）决定火舌的高度与亮度，`data.ignited`（被点燃数）决定 hit 的强度。
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
        // 喷：整片扇面火舌，顶点就是判定区域。
        wave: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "wave_fill", bind: "path", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/vanilla/flame",
                    rate: { data: "motes", fallback: 28 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.05, 0.2],
                    lifetime: [8, 16], size: [0.3, 0.06], sizeMode: "sin",
                    color: 0x6FD08A, alpha: [0.8, 0], light: "full", maxParticles: 260
                },
                {
                    // Ember height reads data.best: the more the struck targets had raised, the taller the envy flares.
                    name: "wave_fire", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 30, interval: 3, repeats: 2 }, shape: { kind: "cylinder", radius: 0.5, length: { data: "rise", fallback: 1.2 } },
                    direction: "up", speed: [0.08, 0.3],
                    lifetime: [10, 20], size: [0.26, 0.06],
                    color: 0xB6F0A0, alpha: [0.7, 0], light: "full", maxParticles: 150
                },
                {
                    name: "wave_edge", bind: "path", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 40, shape: { kind: "polyline" },
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
