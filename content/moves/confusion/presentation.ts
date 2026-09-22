/**
 * 念力 / confusion 的客户端表现。
 *
 * 一句话：施法者眉间把念力收成一点紫光 → 一枚念弹贴着地面直线窜出、拖一层细紫尾 → 命中处炸开一圈
 * 扭曲的紫环；被缠住的人头顶从此盘一只飞鸟，每次想反打都被一小撮紫烟再敲一下。
 * 色相家族：超能力紫（0xB15CE0 主 / 0xE0A8F0 亮 / 0x6B3FA0 暗）为主体，近白只给命中核心。
 * 拍子：起 windup（聚念）→ 行 flight（念弹带尾）→ 击 burst/hit（紫环与扭曲）→ 果 daze（飞鸟）
 *   → 反打 punish（被敲一下）→ 续 linger（低密度余韵）。
 * 范围：burst 的紫环半径按 `data.scale`（判定半径 / 0.3）铺开，就是念弹到哪、判定到哪。
 * 运动：flight 绑 projectile 沿直线拖尾；windup 向内收；burst 的外环与 dust 向外炸。
 * 数：`data.motes`（特攻与等级派生）决定飞行尾迹、命中紫光与余韵的密度，`data.intensity` 抬高亮度。
 */
const ConfusionDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather_swirl", bind: "source", offset: [0, 0.05, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 22, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [8, 16], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0xB15CE0, alpha: [0.8, 0], light: "full", maxParticles: 44
                },
                {
                    name: "gather_glint", bind: "source", offset: [0, 0.05, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE0A8F0, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        flight: {
            duration: 90,
            exit: { stop: 70, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 30, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 12], size: [0.22, 0.04],
                    color: 0xB15CE0, alpha: [0.9, 0], light: "full", maxParticles: 36
                },
                {
                    name: "tail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.28 }, rate: { data: "motes", fallback: 12 },
                    direction: "away", speed: [0.0, 0.05], spread: 26,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0x9B5FC0, alpha: [0.6, 0], light: "full", maxParticles: 80
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "ring", bind: "point", fit: "none", offset: [0, 0.18, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [10, 18], size: [0.28, 0.7],
                    color: 0xB15CE0, alpha: [0.7, 0], light: "full", maxParticles: 6
                },
                {
                    name: "twist", bind: "point", fit: "none", offset: [0, 0.22, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.2], spread: 32, drag: 0.9,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0x6B3FA0, alpha: [0.75, 0], light: "world", maxParticles: 90
                },
                {
                    name: "glint", bind: "point", fit: "none", offset: [0, 0.22, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [8, 16], size: [0.09, 0.01],
                    color: 0xE0A8F0, alpha: [0.9, 0], light: "full", maxParticles: 70
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.1, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF0D8FF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "sparks", bind: "target", offset: [0, 0.1, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.16], spread: 30,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xE0A8F0, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        daze: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "birds", bind: "target", offset: [0, 0.3, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 4, interval: 3, repeats: 3 }, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 24], size: [0.22, 0.1], sizeMode: "sin",
                    color: 0xB15CE0, alpha: [0.6, 0], light: "full", maxParticles: 20
                },
                {
                    name: "wobble", bind: "target", offset: [0, 0.15, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1, interval: 5, repeats: 3 },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.2, 0.4],
                    color: 0x9B5FC0, alpha: [0.5, 0], light: "full", maxParticles: 8
                }
            ]
        },
        punish: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "jab", bind: "target", offset: [0, 0.05, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 2 },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.22, 0.04], sizeMode: "index",
                    color: 0xE0A8F0, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 5
                },
                {
                    name: "haze", bind: "target", offset: [0, 0.1, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 22], size: [0.16, 0.02],
                    color: 0x4A2A66, alpha: [0.28, 0], light: "world", maxParticles: 20
                }
            ]
        },
        linger: {
            exit: { drain: 34 },
            emitters: [
                {
                    name: "linger_bird", bind: "target", offset: [0, 0.3, 0], height: 1.06,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 3, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 28], size: [0.18, 0.07], sizeMode: "sin",
                    color: 0xB15CE0, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 12
                },
                {
                    name: "linger_orb", bind: "target", offset: [0, 0.12, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 4, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.09, 0.02],
                    color: 0xE0A8F0, alpha: [0.32, 0], light: "full", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_confusion", 1, ConfusionDefinition);
