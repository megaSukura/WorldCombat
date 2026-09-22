/**
 * 冲浪 / surf 的客户端表现。
 *
 * 一句话：水从施法者脚下攒起，随即一整圈水墙贴着地面同时向外翻卷，浪头高过人身、碎成白沫，
 * 被淹到的人各炸开一团水花；浪扫过的地方，地面明火被沤成一缕白汽。
 * 色相家族：水蓝为主体（0x4F9FD4）、亮蓝作边缘（0x9BD2F5）、近白只给泡沫高光（0xEAF7FF）；灭火白汽用中性灰。
 * 拍子：起 gather 14t ／ 漫 surge 随浪头推进 ／ 击 hit 每个目标一处 ／ 收 settle 或空浪 miss。
 * 持续状态：surge 的水墙贴地低密度、不遮视线；douse 只在灭火处冒一小缕白汽。
 * 范围：surge 的环与泡沫按 `data.front`（这一拍浪头到哪）画出，圈到哪就会被淹到哪；
 * 运动：水墙从脚下沿地面逐环向外推进，浪头带一点向上翻卷，最后在 `data.radius` 处拍散；
 * 数：`data.spray`（特攻与体宽派生）决定每秒溅水量，`data.intensity`（威力派生）抬高命中水花，
 *   `data.crest`（浪高派生）决定水墙立起多高，`data.scale`（浪墙半径/4.6）放大尺度。
 */
const SurfDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "sink", bind: "source", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 20, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.03, 0.1], spread: 10,
                    lifetime: [8, 16], size: [0.26, 0.06], sizeMode: "sin",
                    color: 0x6FB6E8, alpha: [0.55, 0], light: "full", maxParticles: 56
                },
                {
                    name: "beads", bind: "source", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 12, shape: { kind: "circle", radius: 0.7 },
                    direction: "up", speed: [0.01, 0.05], spread: 12,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x9BD2F5, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "tide_line", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: 16, shape: { kind: "ring", radius: { data: "radius", fallback: 4.6 } },
                    direction: "up", speed: [0.01, 0.04], spread: 8,
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0x8FA6B8, alpha: [0.35, 0], light: "world", maxParticles: 60
                }
            ]
        },
        surge: {
            duration: 26,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "wall", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: { data: "spray", fallback: 24 }, shape: { kind: "ring", radius: { data: "front", fallback: 0.6 } },
                    direction: "outward", speed: [0.14, 0.42], spread: 8,
                    gravity: 0.02, drag: 0.97,
                    lifetime: [10, 20], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x5FA8DC, alpha: [0.7, 0], light: "full", maxParticles: 220
                },
                {
                    name: "crest", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    rate: { data: "spray", fallback: 16 }, shape: { kind: "ring", radius: { data: "front", fallback: 0.6 } },
                    direction: "outward", speed: [0.18, 0.5], spread: 14,
                    gravity: 0.05, drag: 0.95,
                    lifetime: [12, 24], size: [0.7, 1.25], sizeMode: "sin",
                    color: 0x9BD2F5, alpha: [0.75, 0], light: "full", maxParticles: 160
                },
                {
                    name: "foam", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: { data: "spray", fallback: 18 }, shape: { kind: "ring", radius: { data: "front", fallback: 0.6 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 12,
                    gravity: 0.03, drag: 0.92,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xEAF7FF, alpha: [0.7, 0], light: "world", maxParticles: 190
                },
                {
                    name: "damp", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "spray", fallback: 14 }, shape: { kind: "circle", radius: { data: "front", fallback: 0.6 } },
                    direction: "outward", speed: [0.04, 0.16], spread: 16,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xAFC4D4, alpha: [0.4, 0], light: "world", maxParticles: 180
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_water",
                    burst: { count: { data: "spray", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.12, 0.42], spread: 20,
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xEAF7FF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "splash", bind: "target", offset: [0, 0.1, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/water/giantsplash",
                    burst: { count: { data: "spray", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.18, 0.55], spread: 24,
                    gravity: 0.05, drag: 0.95,
                    lifetime: [10, 20], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x9BD2F5, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "drops", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/bubble/bigbubble",
                    burst: { count: { data: "spray", fallback: 8 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.3], spread: 30,
                    gravity: 0.06, drag: 0.94,
                    lifetime: [14, 26], size: [0.12, 0.03],
                    color: 0xCFE9F8, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        douse: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "steam", bind: "point", offset: [0, 0.15, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14, interval: 3, repeats: 3, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.05, 0.18], spread: 14,
                    gravity: -0.01, drag: 0.9,
                    lifetime: [18, 30], size: [0.35, 0.7], sizeMode: "sin",
                    color: 0xD8DEE4, alpha: [0.55, 0], light: "world", maxParticles: 60
                }
            ]
        },
        settle: {
            duration: 26,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "recede", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: { data: "spray", fallback: 12 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4.6 }, thickness: 0.9 },
                    direction: "inward", speed: [0.02, 0.08], spread: 10,
                    lifetime: [14, 26], size: [0.3, 0.6], sizeMode: "sin",
                    color: 0x6FB6E8, alpha: [0.35, 0], light: "world", maxParticles: 120
                },
                {
                    name: "mist", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "circle", radius: { data: "radius", fallback: 4.6 } },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 28], size: [0.05, 0.01],
                    color: 0xAFC4D4, alpha: [0.25, 0], light: "world", maxParticles: 120
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "scuff", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 18 },
                    shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.06, 0.2], spread: 12,
                    gravity: 0.04, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.02],
                    color: 0x8FA6B8, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_surf", 1, SurfDefinition);
