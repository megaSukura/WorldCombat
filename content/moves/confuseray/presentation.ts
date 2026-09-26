/**
 * 奇异之光 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者手里攒起一束幽紫的细光，沿真实判定的方向射出去，到第一个碰上的东西就停住；
 * 照进活人的眼里只落下枚晕符，之后目标头顶一直转着一只迷路的飞鸟。
 *
 * 色相家族：幽紫（0x8A5CFF）为主体，靛蓝（0x5A3FA0）只压在核心，近白只做高光小点。
 * 层次：汇聚（起手）、细光（沿 data.direction 的截断直线，长度绑机制射程 data.reach）、
 *       晕符（命中只一枚，绑在目标头顶）、打墙（splinter 撞在真实方块面）、
 *       被身体挡下（blocked）、控制免疫（ward）、空放（dissipate）、迷乱飞鸟（持续）、反噬（真正失误后碎开）。
 * 起击收：windup（攒光）→ beam（到截断点为止）→ main（晕符）→ linger（还在发懵）。
 * 数：细光上的高光数与命中密度按服务端 data.motes 派生，越强的特攻越密；光束长度按 data.reach。
 */
const ConfuserayDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            emitters: [
                {
                    name: "gather_orb", bind: "source", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 26, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "sin",
                    color: 0x8A5CFF, alpha: [0.8, 0], alphaMode: "sin", light: "full", maxParticles: 60
                },
                {
                    name: "gather_glint", bind: "source", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xCDB8FF, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        beam: {
            duration: 26,
            emitters: [
                {
                    name: "beam_core", bind: "source", height: 0.62, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 150, shape: { kind: "line", length: { data: "reach", fallback: 16 } },
                    direction: "shape", speed: [0.35, 0.7],
                    lifetime: [4, 9], size: [0.18, 0.03],
                    color: 0x8A5CFF, alpha: [0.95, 0], light: "full", maxParticles: 220
                },
                {
                    name: "beam_glint", bind: "source", height: 0.62, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "line", length: { data: "reach", fallback: 16 } },
                    direction: "shape", speed: [0.25, 0.6],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xCDB8FF, alpha: [0.95, 0], light: "full", maxParticles: 180
                }
            ]
        },
        main: {
            duration: 42,
            emitters: [
                {
                    name: "stun_mark", bind: "target", offset: [0, 0.3, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 5, interval: 3, repeats: 3 }, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.24, 0.12], sizeMode: "sin",
                    color: 0x8A5CFF, alpha: [0.65, 0], light: "full", maxParticles: 20
                }
            ]
        },
        ward: {
            duration: 24,
            emitters: [
                {
                    name: "ward_flare", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.9,
                    lifetime: [8, 14], size: [0.14, 0.02],
                    color: 0x4A3A78, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        blocked: {
            duration: 18,
            emitters: [
                {
                    name: "blocked_soak", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 8 }, shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.12, 0.02],
                    color: 0x5A3FA0, alpha: [0.5, 0], light: "full", maxParticles: 18
                }
            ]
        },
        splinter: {
            duration: 20,
            emitters: [
                {
                    name: "wall_scatter", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "outward", speed: [0.04, 0.16], spread: 24, gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0x8A5CFF, alpha: [0.6, 0], light: "world", maxParticles: 28
                },
                {
                    name: "wall_spark", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 6 }, shape: { kind: "sphere_surface", radius: 0.18 },
                    direction: "outward", speed: [0.05, 0.2], spread: 20,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xCDB8FF, alpha: [0.8, 0], light: "full", maxParticles: 16
                }
            ]
        },
        dissipate: {
            duration: 16,
            emitters: [
                {
                    name: "fade_glint", bind: "point", height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.88,
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xCDB8FF, alpha: [0.5, 0], light: "full", maxParticles: 16
                }
            ]
        },
        linger: {
            exit: { drain: 36 },
            emitters: [
                {
                    name: "linger_bird", bind: "target", offset: [0, 0.35, 0], height: 1.08,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 4, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 30], size: [0.2, 0.08], sizeMode: "sin",
                    color: 0x8A5CFF, alpha: [0.42, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "linger_orb", bind: "target", offset: [0, 0.15, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 28], size: [0.1, 0.02],
                    color: 0xCDB8FF, alpha: [0.35, 0], light: "full", maxParticles: 16
                }
            ]
        },
        fumble: {
            duration: 26,
            emitters: [
                {
                    name: "fumble_burst", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 22 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [7, 13], size: [0.24, 0.03], sizeMode: "index",
                    color: 0x5A3FA0, alpha: [1, 0], light: "full", bloom: 0.25
                },
                {
                    name: "fumble_smoke", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.18, 0.26],
                    color: 0x3A2A66, alpha: [0.22, 0], light: "world", maxParticles: 30
                },
                {
                    name: "fumble_bird", bind: "target", offset: [0, 0.2, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 4, interval: 3, repeats: 2 }, shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [12, 20], size: [0.2, 0.1], sizeMode: "sin",
                    color: 0x8A5CFF, alpha: [0.5, 0], light: "full", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_confuseray", 1, ConfuserayDefinition);
