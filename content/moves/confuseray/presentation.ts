/**
 * 奇异之光 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者手里攒起一束幽紫的光，沿直线射出去；命中处炸开一团幽灵色的火花，
 * 目标头顶从此转着一只迷路的飞鸟。
 *
 * 色相家族：幽紫（0x8A5CFF）为主体，靛蓝（0x5A3FA0）只压在核心，近白只做高光小点。
 * 层次：汇聚（起手）、光束（沿目标方向的直线，长度绑机制射程）、命中爆（幽灵冲击＋内收环）、
 *       迷乱飞鸟（持续）、反噬（打中别人后自伤的一顿）。
 * 起击收：windup（攒光）→ beam（射出去）→ main（落到眼里）→ linger（还在发懵）。
 * 数：命中爆的爆发量与光束上的高光数按服务端 data.motes 派生，越强的特攻越密；光束长度按 data.reach。
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
                    name: "beam_core", bind: "source", height: 0.62, orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 170, shape: { kind: "line", length: { data: "reach", fallback: 16 } },
                    direction: "shape", speed: [0.4, 0.8],
                    lifetime: [5, 10], size: [0.26, 0.04],
                    color: 0x8A5CFF, alpha: [0.95, 0], light: "full", maxParticles: 260
                },
                {
                    name: "beam_glint", bind: "source", height: 0.62, orient: "toward",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 16 }, interval: 2, repeats: 2 },
                    shape: { kind: "line", length: { data: "reach", fallback: 16 } },
                    direction: "shape", speed: [0.3, 0.7],
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xCDB8FF, alpha: [0.95, 0], light: "full", maxParticles: 180
                }
            ]
        },
        main: {
            duration: 40,
            emitters: [
                {
                    name: "hit_core", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "motes", fallback: 20 } }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.06, 0.26],
                    lifetime: [7, 14], size: [0.3, 0.03], sizeMode: "index",
                    color: 0xB9A2FF, alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "hit_ring", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 42 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.11],
                    lifetime: [12, 18], size: [0.36, 0.16],
                    color: 0x8A5CFF, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "hit_bird", bind: "target", offset: [0, 0.3, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 5, interval: 3, repeats: 3 }, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.24, 0.12], sizeMode: "sin",
                    color: 0x8A5CFF, alpha: [0.6, 0], light: "full", maxParticles: 20
                },
                {
                    name: "hit_dust", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 28 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.92,
                    lifetime: [14, 24], size: [0.06, 0.01],
                    color: 0x5A3FA0, alpha: [0.5, 0], light: "world", maxParticles: 44
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
