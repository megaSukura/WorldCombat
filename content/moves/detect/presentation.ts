/**
 * 看穿的客户端表现。
 *
 * 一句话：眼前展开一道薄薄的读招幕，来袭被看穿的一瞬在身周炸开一圈冷蓝的读纹与一个惊叹号，随后自己拖出速度线进入先机。
 * 色相家族：灵能冷蓝与淡紫（psyring / psyspiral / screen / sparkle），惊叹号用同族亮白。
 * 拍子：起（focus 0–12t，薄幕与内聚光点）→ 击（read 爆圈）→ 收（opening 速度线，或 miss 淡去）。
 * 范围：focus 的幕与 read 的环按 `data.scale`（闪光半径／1.2）铺开——画面就是读招作用的那一圈。
 * 运动：凝神时薄幕由外向内收光；读中时从中心炸开一圈读纹并向攻击方向偏；先机的速度线贴身后掠。
 * 数：`data.scale` 放大读纹半径，`data.power`（免除量／最大生命）决定读纹亮度与拖尾长度，`data.intensity`（先机等级／2）决定速度线密度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DetectDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        focus: {
            duration: 16,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "screen", bind: "source", offset: [0, 0.6, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/screen",
                    rate: 14, shape: { kind: "arc", radius: { data: "scale", fallback: 1 }, arcDegrees: 120 },
                    direction: "shape", speed: [0.0, 0.02], spin: 6,
                    lifetime: [8, 16], size: [0.5, 0.36],
                    color: 0x8FD0FF, alpha: [0.35, 0.08], alphaMode: "sin",
                    light: "full", maxParticles: 60
                },
                {
                    name: "gather", bind: "source", offset: [0, 0.6, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsalphaboost",
                    rate: 22, shape: { kind: "sphere_surface", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.09, 0.03], sizeMode: "index",
                    color: 0xCFE8FF, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        read: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "psy_ring", bind: "target", offset: [0, 0.55, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 2, at: 1, interval: 3 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.5, 0.14],
                    color: 0x9FB8FF, alpha: [0.85, 0], light: "full", bloom: 0.3
                },
                {
                    name: "flash", bind: "target", offset: [0, 0.55, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 14, at: 1 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [7, 13], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.4
                },
                {
                    name: "mark", bind: "target", offset: [0, 0.9, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/exclamation",
                    burst: { count: 1, at: 2 }, shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.01],
                    lifetime: [18, 26], size: [0.3, 0.3],
                    color: 0xEAF4FF, alpha: [1, 0], light: "full"
                },
                {
                    name: "spiral", bind: "target", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: 20 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.18], spin: 24,
                    lifetime: [10, 20], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xB7CCFF, alpha: [0.8, 0], light: "full", maxParticles: 70
                }
            ]
        },
        opening: {
            duration: 40,
            exit: { stop: 24, drain: 20 },
            emitters: [
                {
                    name: "speedlines", bind: "source", offset: [0, 0.45, 0], height: 0.35, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 40, shape: { kind: "box", size: [0.3, 0.3, 0.3] },
                    direction: "shape", speed: [0.02, 0.08], trail: { minDistance: 0.25 },
                    lifetime: [6, 11], size: [0.18, 0.05],
                    color: 0xCFE8FF, alpha: [0.65, 0], light: "full", maxParticles: 160
                },
                {
                    name: "aura", bind: "source", offset: [0, 0.5, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 18, shape: { kind: "sphere", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.05], spin: 20,
                    lifetime: [10, 18], size: [0.11, 0.02], sizeMode: "sin",
                    color: 0x9FB8FF, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "fade", bind: "target", offset: [0, 0.6, 0], height: 0.4, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 16 }, shape: { kind: "arc", radius: { data: "scale", fallback: 1 }, arcDegrees: 120 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.16, 0.04],
                    color: 0x8AA0C0, alpha: [0.4, 0], gravity: 0.02, light: "world", maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_detect", 1, DetectDefinition);
