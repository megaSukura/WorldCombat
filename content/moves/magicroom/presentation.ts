/**
 * 魔法空间 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者脚下荡开一圈银灰的静默波纹，撑起一片把光吸走的空间；谁走进去，
 * 身上的道具微光被一缕向内的银尘抽走、暗淡下来；空间散去，微光落回道具上。
 *
 * 色相家族：静默银（0xC8D0E0）为主体，近白（0xF0F4FF）做高光，灰蓝（0x8A93A8）做地面影与余韵。
 * 一个效果一个色相家族。持续层是贴地的边界环，低密度、低高度，让出目标本体视线。
 * 层次：内收（起手）／边界环＋银尘（撑开）／贴地边界（持续）／被静默一下（事件）／回光与收。
 * 起击收：windup（聚拢）→ open（撑开）→ inside（持续）→ gag（道具失声）／chip（微光落回）→ 收。
 * 数：撑开与持续的粒子量绑定服务端算出的 data.density；边界半径绑定 data.scale（机制半径／定义半径）。
 */
const MagicroomDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "hush_gather", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 9, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [16, 26], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0xF0F4FF, alpha: [0.6, 0], light: "world", maxParticles: 24
                }
            ]
        },
        open: {
            duration: 46,
            exit: { stop: 16, drain: 32 },
            emitters: [
                {
                    name: "open_ring", bind: "point", height: 0.05, offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 34 }, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.34, 0.16],
                    color: 0xF0F4FF, alpha: [0.45, 0], light: "world", maxParticles: 70
                },
                {
                    name: "open_motes", bind: "point", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "density", fallback: 22 } }, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.04, 0.14], drag: 0.92,
                    lifetime: [18, 30], size: [0.22, 0.05], sizeMode: "index",
                    color: 0xC8D0E0, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "open_dust", bind: "point", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0x8A93A8, alpha: [0.35, 0], light: "world", maxParticles: 36
                }
            ]
        },
        inside: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "edge_ring", bind: "point", height: 0.03,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 5, shape: { kind: "ring", radius: 3.4 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [20, 34], size: [0.28, 0.1], sizeMode: "sin",
                    color: 0xC8D0E0, alpha: [0.24, 0], alphaMode: "sin", light: "world", maxParticles: 34
                },
                {
                    name: "edge_dots", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: { data: "density", fallback: 22 },
                    shape: { kind: "ring", radius: 3.4 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [18, 30], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xF0F4FF, alpha: [0.2, 0], light: "world", maxParticles: 28
                }
            ]
        },
        gag: {
            duration: 22,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "gag_drain", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/sparkle",
                    burst: { count: 14 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.05, 0.18], drag: 0.9,
                    lifetime: [12, 20], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xC8D0E0, alpha: [0.75, 0], light: "world", maxParticles: 36
                },
                {
                    name: "gag_dim", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.94,
                    lifetime: [16, 26], size: [0.24, 0.4],
                    color: 0x8A93A8, alpha: [0.3, 0], light: "world", maxParticles: 20
                }
            ]
        },
        chip: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "chip_return", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.94,
                    lifetime: [12, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xF0F4FF, alpha: [0.6, 0], light: "full", bloom: 0.15, maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_magicroom", 1, MagicroomDefinition);
