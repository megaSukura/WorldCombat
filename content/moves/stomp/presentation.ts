/**
 * 踩踏 / stomp 的客户端表现。
 *
 * 一句话：抬起大脚、脚边尘土上跳 → 整只重量砸到目标点上，贴地炸开一圈与震波同径的土浪与钝白冲击，
 * 冲击点碎屑四散，最后落点留下一片被踩实的土痕。
 * 色相家族：土棕（0x8A7A62 / 0x6E5A3E）与钝白冲击（0xFFF2D8）；没有饱和色。
 * 拍子：起 raise（抬脚聚土）→ 击 slam（峰值）→ hit/shock（命中与震波）→ 收 crater（塌陷余韵）／ flinch。
 * 范围：slam 的地面环半径直接绑定 data.shock，画出的就是震波真正能扫到的范围；crater 环绑定 data.radius。
 * 运动：土浪从落点贴地向外推，碎屑向下砸后弹开；抬脚层是向内汇聚的尘土。
 * 数：`data.quake`（震波半径 ×24）决定贴地土浪的点数，`data.scale`（落脚判定 / 0.5）放大踩点，
 * `data.intensity`（主砸威力 / 80）抬高冲击亮度与密度，`data.radius`（塌陷半径）画出痕迹范围。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const StompDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        raise: {
            duration: 18,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "coil", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0x8A7A62, alpha: [0.55, 0], light: "world", maxParticles: 60
                },
                {
                    name: "lift", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 7, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.08, 0.02],
                    color: 0xC7B89A, alpha: [0.5, 0], light: "full", bloom: 0.2, maxParticles: 26
                }
            ]
        },
        mark: {
            duration: 20,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "footprint", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 8, at: 1, interval: 4, repeats: 2 },
                    shape: { kind: "ring", radius: { data: "foot", fallback: 0.5 } },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0xC7B89A, alpha: [0.65, 0], light: "world", maxParticles: 34
                },
                {
                    name: "gather", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "ring", radius: { data: "foot", fallback: 0.5 } },
                    direction: "inward", speed: [0.01, 0.05],
                    gravity: 0.02, drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        slam: {
            duration: 30,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "quake_ring", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: { data: "quake", fallback: 26 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "shock", fallback: 1.6 } },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [9, 16], size: [0.4, 0.08], sizeMode: "index",
                    color: 0x8A7A62, alpha: [0.75, 0], light: "world", maxParticles: 140
                },
                {
                    name: "impact_core", bind: "point", offset: [0, 0.3, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 18, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [5, 10], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "dirt_spray", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "quake", fallback: 26 } },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.28],
                    gravity: 0.06, drag: 0.93,
                    lifetime: [8, 16], size: [0.14, 0.03], sizeMode: "index",
                    color: 0x6E5A3E, alpha: [0.7, 0], light: "world", maxParticles: 160
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crush", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 6, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [6, 11], size: [0.36, 0.06], sizeMode: "index",
                    color: 0xFFF2D8, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 20
                },
                {
                    name: "grit", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0x8A7A62, alpha: [0.65, 0], light: "world", maxParticles: 80
                }
            ]
        },
        shock: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "tremor", bind: "point", offset: [0, 0.07, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "quake", fallback: 16 }, at: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [8, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xC7B89A, alpha: [0.6, 0], light: "world", maxParticles: 70
                }
            ]
        },
        flinch: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "dazed", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [11, 17], size: [0.13, 0.04],
                    color: 0xFFF2D8, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 20
                }
            ]
        },
        crater: {
            duration: 26,
            exit: { stop: 11, drain: 20 },
            emitters: [
                {
                    name: "settle", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "cells", fallback: 12 }, at: 2, interval: 4, repeats: 3 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 1.1 } },
                    direction: "up", speed: [0.02, 0.08], spread: 20,
                    gravity: 0.03, drag: 0.94,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x8A7A62, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stomp", 1, StompDefinition);
