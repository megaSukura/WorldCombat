/**
 * Client definition for Sleep Talk.
 *
 * 一句话：睡着的身体头顶浮起一串梦泡与呓语轨迹，梦里浮出的招式在头顶炸开一下，梦泡数量随
 * 施法者的等级与特攻（data.echoes）增长。
 *
 * 色相家族：睡眠紫 0x6D5BD0 与它变淡的 0xB9A8F0，加白色强调；与睡眠状态的图标同色系。
 * 拍子：murmur 0–30t（起：由少到多）→ draw 0–24t（击：密集一闪，收：散开淡化）。
 * 贴图与帧尺寸来自 particle_types.txt。
 */
const sleeptalkDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        murmur: {
            duration: 30,
            exit: { stop: 24, drain: 24 },
            emitters: [
                {
                    name: "murmur_zzz", bind: "source", offset: [0, 1.1, 0],
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    rate: 10,
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.05], spread: 6,
                    lifetime: [20, 30], size: [0.3, 0.12], sizeMode: "sin",
                    color: 0x6D5BD0, alpha: [0.9, 0], alphaMode: "sin", light: "full", maxParticles: 90
                },
                {
                    name: "murmur_echo", bind: "source", offset: [0, 0.95, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    burst: { count: { data: "echoes", fallback: 6 }, interval: 6, repeats: 3 },
                    shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.12], spread: 8,
                    lifetime: [16, 26], size: [0.12, 0.02],
                    color: 0xB9A8F0, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "murmur_bubble", bind: "source", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/status/sleep_bubble",
                    rate: 6,
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [18, 28], size: [0.22, 0.06],
                    color: 0x8C7BE0, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        draw: {
            duration: 24,
            exit: { stop: 16, drain: 22 },
            emitters: [
                {
                    name: "draw_flash", bind: "source", offset: [0, 1.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "echoes", fallback: 6 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "shape", speed: [0.12, 0.32], spread: 12,
                    lifetime: [10, 18], size: [0.18, 0.02],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "draw_ring", bind: "source", offset: [0, 0.9, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 20 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.25, 0.42], spread: 2,
                    lifetime: [12, 18], size: [0.22, 0.05],
                    color: 0xB9A8F0, alpha: [0.7, 0], light: "full", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sleeptalk", 1, sleeptalkDefinition);
