/**
 * 蝶舞 / quiverdance 的客户端表现。
 *
 * 一句话：翅上先抖落几点鳞粉 → 舞者左右交替轻点几步，每一拍从身侧向外洒出一圈亮粉与花瓣似的鳞片 →
 * 鳞粉在身周悬停成一圈贴身的薄幕、慢慢飘转；散场时一起落下。
 * 色相家族：蝶粉 0xE8B0D8 为主体，深紫 0xC98FC0 作脚下与余韵，近白 0xFFF0FA 只落在强调层。
 * 拍子：起（unfurl 0–14t）→ 扬（flutter 每拍 0–20t）→ 垂（bloom 0–34t）→ 幕（veil 持续）→ 散（disperse）。
 * 范围：bloom 与 veil 都贴身体、半径绑 `data.veil`（实际鳞幕半径），不再在地面铺成环形地场。
 * 运动：unfurl 鳞粉向身体收拢；flutter 向外洒、带重力缓落，真实侧步的那一拍脚下才点尘（`data.tap`）；
 *   veil 沿身周缓慢上浮绕转（低密度，让出视线），随身体移动。
 * 数：鳞粉数量绑 `data.scales`（特攻与特防、等级派生，厚幕 ×1.4），拍数绑 `data.flutters`、当前第几拍绑 `data.index`。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const QuiverDanceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        unfurl: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "unfurl_ring", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    rate: 12, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [9, 15], size: [0.3, 0.08],
                    color: 0xE8B0D8, alpha: [0.5, 0], light: "full", maxParticles: 30
                },
                {
                    name: "unfurl_mote", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.02], sizeMode: "sin",
                    color: 0xFFF0FA, alpha: [0.6, 0], light: "full", maxParticles: 36
                }
            ]
        },
        flutter: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "scale_burst", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "scales", fallback: 5 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "veil", fallback: 0.9 } },
                    direction: "outward", speed: [0.05, { data: "drift", fallback: 0.06 }],
                    gravity: 0.02, drag: 0.92,
                    lifetime: [12, 20], size: [0.16, 0.03], sizeMode: "index",
                    color: 0xE8B0D8, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "petal", bind: "source", offset: [0, 0.6, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/vanilla/cherry_petal",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.03, 0.1],
                    gravity: 0.012, drag: 0.95, spin: 12,
                    lifetime: [16, 26], size: [0.14, 0.04],
                    color: 0xFFF0FA, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "flutter_spark", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "scales", fallback: 5 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xFFF0FA, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "foot_tap", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "tap", fallback: 0 } },
                    shape: { kind: "circle", radius: 0.26, thickness: 0.8 },
                    direction: "up", speed: [0.03, 0.1], gravity: 0.018, drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0xFFF0FA, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        bloom: {
            duration: 34,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "bloom_ring", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "ring", radius: { data: "veil", fallback: 1.1 } },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [14, 22], size: [0.45, 0.95], sizeMode: "index",
                    color: 0xE8B0D8, alpha: [0.7, 0], light: "full", maxParticles: 26
                },
                {
                    name: "bloom_core", bind: "source", offset: [0, 0.55, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "scales", fallback: 20 } },
                    shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.06, 0.2], drag: 0.92,
                    lifetime: [14, 24], size: [0.18, 0.03], sizeMode: "index",
                    color: 0xFFF0FA, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 160
                },
                {
                    name: "bloom_motes", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "scales", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [14, 26], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xE8B0D8, alpha: [0.75, 0], light: "full", maxParticles: 120
                }
            ]
        },
        veil: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "veil_powder", bind: "source", offset: [0, 0.35, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 8, shape: { kind: "ring", radius: { data: "veil", fallback: 0.9 } },
                    direction: "up", speed: [0.004, 0.02], spin: 10,
                    lifetime: [24, 40], size: [0.1, 0.03],
                    color: 0xE8B0D8, alpha: [0.28, 0], alphaMode: "sin", light: "world", maxParticles: 36
                },
                {
                    name: "veil_dust", bind: "source", offset: [0, 0.08, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 6, shape: { kind: "ring", radius: { data: "veil", fallback: 0.9 } },
                    direction: "up", speed: [0.003, 0.015],
                    lifetime: [20, 36], size: [0.05, 0.01],
                    color: 0xFFF0FA, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 30
                }
            ]
        },
        disperse: {
            duration: 28,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "fall_powder", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: 22 },
                    shape: { kind: "ring", radius: 0.7 },
                    direction: "down", speed: [0.02, 0.06], gravity: 0.02,
                    lifetime: [16, 28], size: [0.12, 0.02],
                    color: 0xC98FC0, alpha: [0.6, 0], light: "world", maxParticles: 60
                },
                {
                    name: "last_mote", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "down", speed: [0.01, 0.04],
                    lifetime: [10, 20], size: [0.05, 0.01],
                    color: 0xE8B0D8, alpha: [0.5, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_quiverdance", 1, QuiverDanceDefinition);
