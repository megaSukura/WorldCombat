/**
 * 劈瓦 / brickbreak 的客户端表现。
 *
 * 一句话：抬臂聚起一线暖光后一步劈下，身前走廊被刀风扫过，落刀处亮起一道竖直短刀痕与火花；
 * 被实际清除的屏障各自炸成冷蓝碎片。
 * 色相家族：砖瓦赭与近白（刀风与火花）为底，屏障碎片用一处冷蓝——「屏障碎了」是这招的第二个含义。
 * 拍子：起（windup 聚光）→ 扫（sweep 走廊）→ 劈（chop 竖直刀痕与落点火花）→ 碎（break 冷蓝碎片）→ 空（miss）。
 * 范围：sweep 用 path 画出服务端走廊判定的同一组四个顶点；chop 用 path 画出落刀平面上的同一道竖直刀痕。
 * 数：`data.notes`（劈斩威力换算）绑定落点火花量，`data.shards`（按实际清除层数换算）绑定碎片量，
 * `data.scale`（碎壁半径 / 8）放大碎片散开的范围。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const BrickbreakDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "raise", bind: "source", offset: [0, 0.8, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xE8B0A0, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "brace", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.02, 0.08],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x8A6A50, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        sweep: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "lane", bind: "path", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    shape: { kind: "polygon" },
                    rate: 26, direction: "shape", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.22, 0.05],
                    color: 0xE8C0A0, alpha: [0.22, 0], light: "full", maxParticles: 80
                }
            ]
        },
        chop: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "edge", bind: "path", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/cut",
                    shape: { kind: "polyline" },
                    rate: 34, direction: "shape", speed: [0.05, 0.18], spread: 10,
                    lifetime: [5, 11], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF4E0C8, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 110
                },
                {
                    name: "impact", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "notes", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.22], spread: 22,
                    lifetime: [7, 14], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF0D8C0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                }
            ]
        },
        break: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "shatter", bind: "point", offset: [0, 0.7, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: { data: "shards", fallback: 10 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.08, 0.26], spread: 28,
                    gravity: 0.05, drag: 0.94,
                    lifetime: [10, 18], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xBFD8F0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 100
                },
                {
                    name: "frost", bind: "point", offset: [0, 0.6, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 14, at: 1 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.9,
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0xDCEFFF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 70
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "whiff", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0x9A8A7A, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_brickbreak", 1, BrickbreakDefinition);
