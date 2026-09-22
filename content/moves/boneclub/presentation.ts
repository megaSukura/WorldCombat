/**
 * 骨棒 / boneclub 的客户端表现。
 *
 * 一句话：举棍转腰 → 沿瞄准方向扫出一条骨头够到的窄长走廊，走廊里扬起土雾、四边亮起骨白的光边；
 * 扫中时在接触点炸开骨屑与地面冲击，棍尖在尽头扫出一道弧光；抡空则骨头磕在地上，留下一片土痕。
 * 色相家族：骨白（0xEAE0C8 / 0xC8B48E）与土棕（0x8A7A62）；饱和色只在骨屑尖端一点。
 * 拍子：起 raise（举棍）→ 挥 swing（走廊成形）→ hit（命中）→ arc（棍尖弧光）／ scuff（磕地）。
 * 范围：swing 的走廊直接用 data.path 的四角画填充与描边，画出的就是判定真正扫到的长条。
 * 运动：土雾在走廊里上浮，光边沿四角铺开；棍尖弧光从一端扫向另一端。
 * 数：`data.clubs`（威力派生）决定骨屑与土雾点数，`data.reach` 与 `data.gauge` 记录这条走廊的真实长度与半宽，
 * `data.scale`（半宽 / 0.5）放大骨屑与光边，`data.cells`（磕出的地痕格数）决定土痕层的点数。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const BoneclubDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 14,
            exit: { stop: 7, drain: 10 },
            emitters: [
                {
                    name: "heft", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 9, shape: { kind: "arc", radius: 0.5, arcDegrees: 140 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xEAE0C8, alpha: [0.55, 0], light: "full", bloom: 0.25, maxParticles: 40
                }
            ]
        },
        swing: {
            duration: 24,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "corridor_fill", bind: "path", height: 0.05, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 110, shape: { kind: "polygon" },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [6, 12], size: [0.1, 0.03],
                    color: 0x8A7A62, alpha: [0.35, 0], light: "world", maxParticles: 240
                },
                {
                    name: "corridor_edge", bind: "path", height: 0.08, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 70, shape: { kind: "polyline", closed: true },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.12, 0.03],
                    color: 0xEAE0C8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 160
                },
                {
                    name: "swing_lines", bind: "source", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 22, shape: { kind: "box", size: [0.3, 0.3, 0.3] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [3, 7], size: [0.15, 0.04],
                    color: 0xD8CBB0, alpha: [0.4, 0], light: "full", maxParticles: 110
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "bone_shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "clubs", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.08, 0.28],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [6, 12], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "ground_grit", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.32, 0.06], sizeMode: "index",
                    color: 0x8A7A62, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 44
                }
            ]
        },
        arc: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "club_sweep", bind: "point", offset: [0, 0.5, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/swipe",
                    burst: { count: 3, at: 1 },
                    shape: { kind: "arc", radius: 0.7, arcDegrees: 150 },
                    orient: "direction", direction: "shape",
                    speed: [0.04, 0.14],
                    lifetime: [5, 10], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xEAE0C8, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        },
        flinch: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "knocked", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [11, 17], size: [0.13, 0.04],
                    color: 0xEAE0C8, alpha: [0.85, 0], light: "full", bloom: 0.22, maxParticles: 20
                }
            ]
        },
        scuff: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "dirt", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "cells", fallback: 10 }, at: 1, interval: 3, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 0.8 } },
                    direction: "up", speed: [0.04, 0.18], spread: 25,
                    gravity: 0.06, drag: 0.93,
                    lifetime: [8, 15], size: [0.12, 0.03],
                    color: 0x8A7A62, alpha: [0.6, 0], light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_boneclub", 1, BoneclubDefinition);
