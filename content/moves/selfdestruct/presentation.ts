/**
 * 自爆 / selfdestruct 的客户端表现。
 *
 * 一句话：施法者的身体先急涨、缝里透出白光，随即在原地炸成一颗紧凑的白热球，碎屑四面炸飞、
 * 一圈尘烟向外压出，最后地上留下一片炸焦的痕迹。
 * 色相家族：近白金做爆心高光（0xFFF4D8），暖橙与浓烟作主体（cloudyfire_white / smoke / burning_rock），
 * 土黄只给落尘。与同族的大爆炸共用暖色家族，但自爆更小、更快、烟更少。
 * 拍子：起 swell 急涨 ／ 击 detonate 爆开 + hit 逐处 ／ 收 scorch 或空爆 miss。
 * 范围：detonate / scorch 的球与地面圈按 `data.radius`（真实爆心半径）画出，圈就是会被炸到的地方。
 * 运动：膨胀的内聚光 → 爆心向外炸飞 → 尘烟上腾、碎屑带重力回落 → 落尘在地面慢慢散去。
 * 数：`data.debris`（体重与物攻派生）决定炸飞碎屑与浓烟的量，`data.intensity`（威力派生）抬高亮度与密度，
 *   `data.cells`（炸焦块数）驱动地面残屑，`data.scale`（爆心/4.0）放大尺度。
 */
const SelfDestructDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        swell: {
            duration: 16,
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "draw", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 18, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.1], spread: 10,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xFFE9A0, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "crack", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/smallexplosion",
                    burst: { count: 8, interval: 3, repeats: 3, at: 2 },
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [5, 10], size: [0.24, 0.06], spriteFrom: "random",
                    color: 0xFFD98A, alpha: [0.8, 0], light: "full", bloom: 0.45, maxParticles: 30
                },
                {
                    name: "heat", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.7 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xC7A98A, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        detonate: {
            duration: 30,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "core", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "debris", fallback: 26 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.25, 0.8], spread: 20,
                    lifetime: [6, 13], size: [0.5, 0.08], sizeMode: "index",
                    color: 0xFFF4D8, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 90
                },
                {
                    name: "fire", bind: "point", offset: [0, 0.35, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "debris", fallback: 20 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 4.0 }, thickness: 0.7 },
                    direction: "outward", speed: [0.2, 0.7], spread: 26,
                    gravity: -0.01, drag: 0.92,
                    lifetime: [12, 24], size: [0.6, 1.1], sizeMode: "sin",
                    color: 0xF0A94E, alpha: [0.9, 0], light: "full", maxParticles: 150
                },
                {
                    name: "shards", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "debris", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.25, 0.9], spread: 30,
                    gravity: 0.1, drag: 0.96,
                    lifetime: [16, 30], size: [0.22, 0.04],
                    color: 0x8A7A62, alpha: [0.9, 0], light: "world", maxParticles: 110
                },
                {
                    name: "cloud", bind: "point", offset: [0, 0.3, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "debris", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 4.0 }, thickness: 0.6 },
                    direction: "up", speed: [0.08, 0.3], spread: 24,
                    gravity: -0.015, drag: 0.88,
                    lifetime: [20, 38], size: [0.7, 1.4], sizeMode: "sin",
                    color: 0x6A6258, alpha: [0.7, 0], light: "world", maxParticles: 140
                },
                {
                    name: "front", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "debris", fallback: 20 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 4.0 } },
                    direction: "outward", speed: [0.03, 0.14], spread: 8,
                    lifetime: [8, 16], size: [0.6, 1.0], sizeMode: "linear",
                    color: 0xF0C98A, alpha: [0.7, 0], light: "world", maxParticles: 120
                }
            ]
        },
        hit: {
            duration: 20,
            exit: { stop: 8, drain: 15 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "debris", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.15, 0.5], spread: 20,
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFF0C8, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "chips", bind: "target", offset: [0, 0.15, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "debris", fallback: 10 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.2, 0.7], spread: 30,
                    gravity: 0.08, drag: 0.95,
                    lifetime: [12, 22], size: [0.12, 0.02],
                    color: 0xF0A94E, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        scorch: {
            duration: 26,
            exit: { stop: 11, drain: 22 },
            emitters: [
                {
                    name: "residue", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "cells", fallback: 14 }, shape: { kind: "circle", radius: { data: "radius", fallback: 4.0 }, thickness: 0.9 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [16, 30], size: [0.06, 0.01],
                    color: 0x6E5A44, alpha: [0.35, 0], light: "world", maxParticles: 120
                },
                {
                    name: "embers", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "cells", fallback: 12 }, interval: 6, repeats: 2, at: 2 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 4.0 }, thickness: 0.9 },
                    direction: "up", speed: [0.02, 0.1], spread: 16,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0xE8843C, alpha: [0.5, 0], light: "full", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "fizzle", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.3], spread: 18,
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFE9A0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.05, 0.16], spread: 16,
                    gravity: -0.01, drag: 0.9,
                    lifetime: [16, 28], size: [0.5, 0.9],
                    color: 0x6A6258, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_selfdestruct", 1, SelfDestructDefinition);
