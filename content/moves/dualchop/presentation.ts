/**
 * 二连劈 / dualchop 的客户端表现。
 *
 * 一句话：施法者抬起前肢、对准身前，第一劈砸下并沿地面犁出一道紫黑色的龙能裂痕，第二劈追着同一处再砸一次。
 * 色相家族：龙紫（0x8E6BD9、0xC79BE8）做劈击与能量，灰白（0xE6E2D8）做碎石，近白只给第二劈的裂痕强调。
 * 拍子：起 raise（抬臂）→ 一 chop1（第一劈砸地）→ 裂 crack（裂痕沿地面铺开）→ 二 chop2（追劈）→ 收 settle。
 * 范围：chop1/chop2 的锥面用 `data.reach` 当长度、`data.span` 当张角；crack 直接消费 `data.path`（与判定同一组
 *   地面顶点）画出裂痕，玩家一眼看出第二劈该落在那条线上。
 * 运动：两劈从施法者身前向下砸；裂痕沿 `data.path` 从脚下向前铺开（`data.quake` 决定长度）。
 * 数：`data.shards`（物攻派生）绑定碎石量，`data.intensity`（实际威力派生）抬高亮度，`data.quake` 决定裂痕长度。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const DualchopDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: { data: "windup", fallback: 9 },
            exit: { stop: 3, drain: 10 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.5, 0.3], height: 0.35, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 3, interval: 2, repeats: 3 },
                    shape: { kind: "box", size: [0.35, 0.35, 0.35] },
                    direction: "inward", speed: [0.02, 0.1], spread: 14,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xC79BE8, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 24
                }
            ]
        },
        chop1: {
            duration: 22,
            exit: { drain: 12 },
            emitters: [
                {
                    name: "arc", bind: "point", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0, interval: 1, repeats: 2 },
                    shape: { kind: "cone_volume", radius: 0.5, length: { data: "reach", fallback: 2.9 }, angleDegrees: { data: "span", fallback: 62 } },
                    direction: "shape", speed: [0.2, 0.5], spread: 12, spin: 9,
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0x8E6BD9, alpha: [0.85, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "dust", bind: "point", fit: "none", start: 2,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "box", size: [0.6, 0.12, 0.6] },
                    direction: "outward", speed: [0.06, 0.24], spread: 34, gravity: 0.09, drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xE6E2D8, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        crack: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "seam", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 30, shape: { kind: "polyline", closed: false },
                    direction: "outward", speed: [0.02, 0.1], spread: 8, gravity: 0.03,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x8E6BD9, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "glow", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 18, shape: { kind: "polyline", closed: false },
                    direction: "up", speed: [0.04, 0.16], spread: 10,
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xC79BE8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 44
                }
            ]
        },
        chop2: {
            duration: 24,
            exit: { drain: 13 },
            emitters: [
                {
                    name: "arc", bind: "point", fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/bigfist",
                    burst: { count: { data: "shards", fallback: 16 }, at: 0, interval: 1, repeats: 2 },
                    shape: { kind: "cone_volume", radius: 0.45, length: { data: "reach", fallback: 2.9 }, angleDegrees: { data: "span", fallback: 62 } },
                    direction: "shape", speed: [0.24, 0.6], spread: 10, spin: -12,
                    lifetime: [6, 12], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xC79BE8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 80
                }
            ]
        },
        hit1: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "break", bind: "target", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 }, direction: "outward", speed: [0.08, 0.3], spread: 22,
                    lifetime: [6, 12], size: [0.34, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                }
            ]
        },
        hit2: {
            duration: 22,
            exit: { stop: 6, drain: 13 },
            emitters: [
                {
                    name: "breach", bind: "target", offset: [0, 0.45, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dragon",
                    burst: { count: { data: "shards", fallback: 18 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.32 }, direction: "outward", speed: [0.12, 0.42], spread: 28,
                    lifetime: [7, 14], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.55, maxParticles: 70
                },
                {
                    name: "rubble", bind: "target", offset: [0, 0.35, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "shards", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 }, direction: "outward", speed: [0.1, 0.4], spread: 30, gravity: 0.1, drag: 0.9,
                    lifetime: [9, 16], size: [0.14, 0.03],
                    color: 0xE6E2D8, alpha: [0.7, 0], light: "world", maxParticles: 44
                }
            ]
        },
        miss1: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "empty", bind: "point", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "shards", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.4 }, direction: "outward", speed: [0.03, 0.12], spread: 16, gravity: 0.02, drag: 0.9,
                    lifetime: [9, 16], size: [0.14, 0.02],
                    color: 0xE6E2D8, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        },
        settle: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "ring", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: { data: "reach", fallback: 2.9 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9,
                    lifetime: [7, 13], size: [0.18, 0.05],
                    color: 0x8E6BD9, alpha: [0.45, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_dualchop", 1, DualchopDefinition);
