/**
 * 大爆炸 / explosion 的客户端表现。
 *
 * 一句话：地面从施法者脚下裂开、光从缝里漏出并向内收拢，随后炸成一朵顶天立地的火球，
 * 近白爆心在正中，外圈冲击环贴着地面横扫出去，浓烟与燃烧的碎屑满天，最后留下一片焦黑弹坑。
 * 色相家族：近白金做爆心高光（0xFFF6E0），暖橙火球作主体（cloudyfire_white / flame），
 * 浓烟用中性深灰，土黄只给飞散的燃烧碎屑。比自爆更大、更亮、烟更多。
 * 拍子：起 charge 蓄力 ／ 爆 detonate 火球 ／ 冲 shock 冲击环 ／ 击 hit 逐处 ／ 收 crater 或空爆 miss。
 * 范围：detonate / crater 的球与地面圈按 `data.radius`（真实爆心半径）画出，圈就是会被炸到的地。
 * 运动：光与尘向内收拢 → 火球从中心向外炸开 → 冲击环贴地横扫 → 浓烟上腾、燃烧碎屑带重力回落。
 * 数：`data.debris`（体重与物攻派生）决定火球、碎屑与浓烟的量，`data.intensity`（威力派生）抬高亮度与密度，
 *   `data.cells`（弹坑块数）驱动地面余烬，`data.scale`（爆心/5.6）放大尺度。
 */
const ExplosionDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 22,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "sink", bind: "source", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.14], spread: 10,
                    lifetime: [6, 13], size: [0.09, 0.01],
                    color: 0xFFE9A0, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "seam", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smallexplosion",
                    burst: { count: 10, interval: 3, repeats: 4, at: 2 },
                    shape: { kind: "ring", radius: 0.9 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [6, 12], size: [0.28, 0.06], spriteFrom: "random",
                    color: 0xFFD98A, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 50
                },
                {
                    name: "ash", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 18, shape: { kind: "circle", radius: { data: "radius", fallback: 5.6 } },
                    direction: "inward", speed: [0.03, 0.12], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xC7A98A, alpha: [0.55, 0], light: "world", maxParticles: 90
                }
            ]
        },
        detonate: {
            duration: 36,
            exit: { stop: 12, drain: 26 },
            emitters: [
                {
                    name: "core", bind: "point", offset: [0, 0.6, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smallexplosion",
                    burst: { count: { data: "debris", fallback: 40 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.7 },
                    direction: "outward", speed: [0.3, 1.0], spread: 18,
                    lifetime: [7, 15], size: [0.7, 0.1], sizeMode: "index",
                    color: 0xFFF6E0, alpha: [1, 0], light: "full", bloom: 0.7, maxParticles: 160
                },
                {
                    name: "ball", bind: "point", offset: [0, 0.5, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "debris", fallback: 36 }, interval: 2, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 5.6 }, thickness: 0.55 },
                    direction: "outward", speed: [0.25, 0.9], spread: 26,
                    gravity: -0.01, drag: 0.92,
                    lifetime: [14, 28], size: [0.9, 1.6], sizeMode: "sin",
                    color: 0xF09A3C, alpha: [0.9, 0], light: "full", maxParticles: 260
                },
                {
                    name: "rock", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "debris", fallback: 30 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.8 },
                    direction: "outward", speed: [0.35, 1.2], spread: 32,
                    gravity: 0.1, drag: 0.96,
                    lifetime: [18, 34], size: [0.28, 0.05],
                    color: 0x8A7A62, alpha: [0.9, 0], light: "world", maxParticles: 180
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    burst: { count: { data: "debris", fallback: 24 }, at: 1 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 5.6 }, thickness: 0.5 },
                    direction: "up", speed: [0.1, 0.4], spread: 22,
                    gravity: -0.02, drag: 0.88,
                    lifetime: [24, 44], size: [0.9, 1.8], sizeMode: "sin",
                    color: 0x5A534B, alpha: [0.75, 0], light: "world", maxParticles: 220
                }
            ]
        },
        shock: {
            duration: 24,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "wave", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: { data: "debris", fallback: 30 }, at: 1 },
                    shape: { kind: "ring", radius: { data: "radius", fallback: 5.6 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 6,
                    lifetime: [9, 17], size: [0.9, 1.5], sizeMode: "linear",
                    color: 0xF0D8A8, alpha: [0.8, 0], light: "world", maxParticles: 160
                },
                {
                    name: "grit", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "debris", fallback: 40 }, shape: { kind: "ring", radius: { data: "radius", fallback: 5.6 } },
                    direction: "outward", speed: [0.08, 0.28], spread: 12,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [14, 26], size: [0.07, 0.01],
                    color: 0x6E5A44, alpha: [0.45, 0], light: "world", maxParticles: 240
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "debris", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.2, 0.65], spread: 22,
                    lifetime: [6, 13], size: [0.5, 0.07], sizeMode: "index",
                    color: 0xFFF0C8, alpha: [1, 0], light: "full", bloom: 0.6, maxParticles: 70
                },
                {
                    name: "chips", bind: "target", offset: [0, 0.15, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/burning_rock",
                    burst: { count: { data: "debris", fallback: 12 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.25, 0.85], spread: 32,
                    gravity: 0.09, drag: 0.95,
                    lifetime: [14, 26], size: [0.16, 0.03],
                    color: 0x8A7A62, alpha: [0.85, 0], light: "world", maxParticles: 80
                }
            ]
        },
        crater: {
            duration: 30,
            exit: { stop: 13, drain: 26 },
            emitters: [
                {
                    name: "residue", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "cells", fallback: 24 }, shape: { kind: "circle", radius: { data: "radius", fallback: 5.6 }, thickness: 0.9 },
                    direction: "up", speed: [0.01, 0.05], spread: 10,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [18, 34], size: [0.06, 0.01],
                    color: 0x5A534B, alpha: [0.3, 0], light: "world", maxParticles: 180
                },
                {
                    name: "embers", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "cells", fallback: 20 }, interval: 8, repeats: 3, at: 2 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 5.6 }, thickness: 0.9 },
                    direction: "up", speed: [0.02, 0.1], spread: 16,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [14, 26], size: [0.12, 0.02],
                    color: 0xE8843C, alpha: [0.5, 0], light: "full", maxParticles: 100
                },
                {
                    name: "smoulder", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 12, shape: { kind: "circle", radius: { data: "radius", fallback: 5.6 } },
                    direction: "up", speed: [0.02, 0.1], spread: 12,
                    gravity: -0.01, drag: 0.88,
                    lifetime: [22, 40], size: [0.5, 0.9], sizeMode: "sin",
                    color: 0x4A443E, alpha: [0.35, 0], light: "world", maxParticles: 120
                }
            ]
        },
        miss: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "flare", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smallexplosion",
                    burst: { count: 20 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.12, 0.4], spread: 18,
                    lifetime: [6, 13], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xFFE9A0, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 40
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.3, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.06, 0.2], spread: 18,
                    gravity: -0.01, drag: 0.9,
                    lifetime: [18, 32], size: [0.6, 1.0],
                    color: 0x5A534B, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_explosion", 1, ExplosionDefinition);
