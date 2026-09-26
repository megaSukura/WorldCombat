/**
 * 秘密之力 / secretpower —— 客户端表现。
 *
 * 一句话：压低身体从脚边吸起材料（尘环向内收）→ 沿直线擦过目标 → 命中处按脚下场所炸开：
 * 中性尘、火焰橙、草木绿、水蓝电黄各一色。一个中性尘灰打底，场所色只在材料层出现。
 * 色相家族：中性尘（0xC9C6BE）是主体，材料色只小面积点缀（火 0xFF9A3C、草 0x8FCF6E、水/电 0x7FD7F0+0xE8E04A）。
 * 命中强弱由服务端算出的 `bursts`（伤害占目标最大生命）决定材料数量。
 * 拍子：起（windup）／行（travel）／击（plain/fire/thicket/water）。
 */
const SecretPowerDefinition: ParticleDefinition = {
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "draw_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 1.0 },
                    direction: "inward", speed: [0.02, 0.05],
                    lifetime: [8, 14], size: [0.42, 0.16],
                    color: 0xC9C6BE, alpha: [0.35, 0], light: "world", maxParticles: 6
                },
                {
                    name: "draw_motes", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xDCD8CE, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "motes", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0xFFFFFF, alpha: [0.8, 0], light: "full", maxParticles: 30
                },
                {
                    name: "hint_ember", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "hintFire", fallback: 0 }, at: 2 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.05, 0.14], gravity: -0.01,
                    lifetime: [8, 16], size: [0.09, 0.01],
                    color: 0xFF9A3C, alpha: [0.9, 0], light: "full", maxParticles: 20
                },
                {
                    name: "hint_leaf", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "hintThicket", fallback: 0 }, at: 2 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.05, 0.14], spin: 9,
                    lifetime: [10, 18], size: [0.14, 0.02],
                    color: 0x8FCF6E, alpha: [0.85, 0], light: "full", maxParticles: 20
                },
                {
                    name: "hint_splash", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "hintWater", fallback: 0 }, at: 2 }, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.05, 0.14], gravity: 0.01,
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x7FD7F0, alpha: [0.8, 0], light: "full", maxParticles: 20
                }
            ]
        },
        travel: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dash_lines", bind: "source", height: 0.5, trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 30, shape: { kind: "sphere", radius: 0.35 },
                    direction: "away", speed: [0.03, 0.10],
                    lifetime: [6, 12], size: [0.36, 0.05],
                    color: 0xD8D4C8, alpha: [0.5, 0], light: "world", maxParticles: 48
                },
                {
                    name: "foot_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 24, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.07], gravity: 0.02,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xC9C6BE, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        plain: {
            duration: 28,
            exit: { stop: 8, drain: 24 },
            emitters: [
                {
                    name: "plain_impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 8, size: [0.36, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", maxParticles: 6
                },
                {
                    name: "plain_ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.8 },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [9, 16], size: [0.4, 0.18],
                    color: 0xD8D4C8, alpha: [0.55, 0], light: "full", maxParticles: 4
                },
                {
                    name: "plain_gravel", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "bursts", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.14], gravity: 0.02,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xC9C6BE, alpha: [0.7, 0], light: "world", maxParticles: 80
                },
                {
                    name: "plain_mark", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "mark", fallback: 0 }, at: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xE8E04A, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        fire: {
            duration: 30,
            exit: { stop: 8, drain: 26 },
            emitters: [
                {
                    name: "cinder_flare", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 2 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.38, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 6
                },
                {
                    name: "cinder_ember", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "bursts", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.16], gravity: 0.012,
                    lifetime: [10, 20], size: [0.07, 0.01],
                    color: 0xFF9A3C, alpha: [0.95, 0], light: "full", maxParticles: 90
                },
                {
                    name: "cinder_flame", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: 8 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [12, 22], size: [0.18, 0.02],
                    color: 0xFFB25A, alpha: [0.8, 0], light: "full", maxParticles: 30
                },
                {
                    name: "fire_mark", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "mark", fallback: 0 }, at: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xFF9A3C, alpha: [0.95, 0], light: "full", maxParticles: 24
                }
            ]
        },
        thicket: {
            duration: 30,
            exit: { stop: 8, drain: 26 },
            emitters: [
                {
                    name: "thicket_leaves", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    burst: { count: { data: "bursts", fallback: 10 } }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.06, 0.16], gravity: 0.014, spin: 9,
                    lifetime: [12, 24], size: [0.16, 0.03],
                    color: 0x8FCF6E, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "thicket_flecks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.12], gravity: 0.012, spin: 12,
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0xB9E890, alpha: [0.9, 0], light: "full", maxParticles: 60
                },
                {
                    name: "thicket_sprout", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: 2, at: 2 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.05, 0.10],
                    lifetime: [14, 24], size: [0.24, 0.08],
                    color: 0x86C96A, alpha: [0.9, 0], light: "full", maxParticles: 6
                },
                {
                    name: "thicket_mark", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "mark", fallback: 0 }, at: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xB9E890, alpha: [0.95, 0], light: "full", maxParticles: 24
                }
            ]
        },
        water: {
            duration: 30,
            exit: { stop: 8, drain: 26 },
            emitters: [
                {
                    name: "surge_splash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "bursts", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.16], gravity: 0.016,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0x7FD7F0, alpha: [0.75, 0], light: "full", maxParticles: 90
                },
                {
                    name: "surge_arc", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 3 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.20],
                    lifetime: [5, 10], size: [0.30, 0.05], sizeMode: "index",
                    color: 0xE8E04A, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 12
                },
                {
                    name: "surge_ring", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "outward", speed: [0.0, 0.0],
                    lifetime: [10, 18], size: [0.42, 0.18],
                    color: 0xAFE8F5, alpha: [0.6, 0], light: "full", maxParticles: 4
                },
                {
                    name: "water_mark", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "mark", fallback: 0 }, at: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.05, 0.14],
                    lifetime: [6, 12], size: [0.16, 0.02],
                    color: 0xE8E04A, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 24
                }
            ]
        }
    },
    interrupt: "drain"
};

WorldCombatParticles.scene("world_combat:move_secretpower", 1, SecretPowerDefinition);
