/**
 * 精神剑 / psyblade 的客户端表现。
 *
 * 一句话：手边先凝出一把几乎看不见的灵刃，只在空气里留下一道折光（起）→ 一步压上、横向劈出一道灵能弧，
 *   几乎看不到刀身，只看到斩痕与飞散的灵屑（击）→ 斩痕与灵屑慢慢散去（收）。站在电荷上时，刃身与斩痕
 *   里窜出电弧、整道弧更亮更粗。
 * 色相家族：紫蓝灵能到近白（0xB79BFF／0xD9CCFF 为主体，0xF0EAFF 做刃光），带电时叠入电黄（0xFFE84D）作小面积强调。
 * 拍子：起（draw 凝刃）→ 击（slash 挥弧、cut 命中、echo 波及）→ 收（余屑）。
 * 范围：斩弧顶点由服务端按机制 reach/span 生成（`data.path`），画面画的就是判定扫过的那段弧。
 * 数：`data.shards`（物攻派生的灵屑量）决定碎屑数量，`data.charged`（是否带电）决定电弧层是否出现、整体亮度，
 *   画面里的数与机制里的数一致。
 */
const PsybladeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        draw: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "blade_glint", bind: "source", offset: [0.45, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "cylinder", radius: 0.06, length: 1.3 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [5, 11], size: [0.05, 0.01],
                    color: 0xF0EAFF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "blade_aura", bind: "source", offset: [0.4, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 6, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.14, 0.03],
                    color: 0xB79BFF, alpha: [0.7, 0], light: "full", bloom: 0.35, maxParticles: 20
                },
                {
                    name: "blade_arcs", bind: "source", offset: [0.4, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: { data: "charged", fallback: 0 }, shape: { kind: "cylinder", radius: 0.1, length: 1.2 },
                    direction: "up", speed: [0.02, 0.1], spin: 20,
                    lifetime: [4, 9], size: [0.07, 0.02],
                    color: 0xFFE84D, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 30
                }
            ]
        },
        slash: {
            duration: 22,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "arc_edge", bind: "path", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    burst: { count: 24, at: 0 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.05, 0.2], spread: 12,
                    lifetime: [5, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xF0EAFF, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 120
                },
                {
                    name: "arc_fill", bind: "path", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 14, at: 0 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.03, 0.12],
                    lifetime: [7, 14], size: [0.24, 0.05],
                    color: 0xB79BFF, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "arc_charged", bind: "path", fit: "none", offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "charged", fallback: 0 }, interval: 1, repeats: 2 }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.08, 0.26], spin: 18,
                    lifetime: [4, 10], size: [0.14, 0.03], sizeMode: "index",
                    color: 0xFFE84D, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 90
                },
                {
                    name: "arc_shards", bind: "path", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "shards", fallback: 16 }, at: 1 }, shape: { kind: "polyline" },
                    direction: "outward", speed: [0.05, 0.2], gravity: 0.03, drag: 0.92,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xD9CCFF, alpha: [0.7, 0], light: "full", maxParticles: 70
                }
            ]
        },
        cut: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "hit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 4, interval: 1, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.34], spread: 26,
                    lifetime: [7, 14], size: [0.44, 0.06], sizeMode: "index",
                    color: 0xF0EAFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 24
                },
                {
                    name: "shards", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: { data: "shards", fallback: 16 } }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.18], gravity: 0.02, drag: 0.93,
                    lifetime: [10, 20], size: [0.09, 0.01],
                    color: 0xD9CCFF, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "cut_arcs", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "charged", fallback: 0 }, interval: 1, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.28], spin: 22,
                    lifetime: [5, 11], size: [0.12, 0.03], sizeMode: "index",
                    color: 0xFFE84D, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 60
                }
            ]
        },
        echo: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "graze", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/cut",
                    burst: { count: 10, at: 0 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.22], spread: 20,
                    lifetime: [6, 12], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xE4D8FF, alpha: [0.8, 0], light: "full", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 16,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    burst: { count: 10, at: 0 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [5, 11], size: [0.2, 0.04],
                    color: 0xCFC4F0, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psyblade", 1, PsybladeDefinition);
