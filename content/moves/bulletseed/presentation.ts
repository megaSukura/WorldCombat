/**
 * 种子机关枪 / bulletseed 的客户端表现。
 *
 * 一句话：口边把籽囤成一簇，随后一发接一发「噗噗噗」地沿准线喷出、每颗拖一条极短的草籽尾，
 *   打在目标上崩开一小撮壳屑；一梭子打完，脚边散落一撮空壳。
 * 色相家族：草绿（seed／xsseed 原色）＋枯黄壳（0xC9C07A）＋一点近白高光（glowingsparkle）。
 * 拍子：起 charge（囤籽）→ 喷 volley（一发接一发）→ 击 hit（籽壳崩开）／ 空 husk → 收 husk（散落空壳）。
 * 范围：本招是单体直线连发，画面靠一串籽的轨迹标出「这一条线上会被打到」，没有地面轮廓。
 * 运动：每颗籽沿准线高速直飞（服务端 velocity），带一点重力下坠；命中向外崩壳。
 * 数：`data.shot` / `data.shots` 让画面读出演到第几发、还剩几发（命中后残留的籽粒数按 `data.shot` 递增），
 *   `data.husk`（物攻换算的壳量）绑定命中碎屑量，`data.intensity`（单籽威力 / 25）放大整幕，
 *   `data.scale`（判定 / 0.2）让大个子的籽更大。
 */
const BulletseedDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 5, drain: 11 },
            emitters: [
                {
                    name: "hoard", bind: "source", offset: [0, 0.5, 0.25], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 18, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.1, 0.03],
                    alpha: [0.9, 0], light: "full", maxParticles: 40
                },
                {
                    name: "chaff", bind: "source", offset: [0, 0.45, 0.25], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 10, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.06, 0.02],
                    color: 0xC9C07A, alpha: [0.5, 0], light: "world", maxParticles: 22
                }
            ]
        },
        volley: {
            duration: 0,
            exit: { drain: 10 },
            emitters: [
                {
                    name: "pellet", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    trail: { minDistance: 0.22 }, rate: 30,
                    direction: "velocity", speed: [0.0, 0.02],
                    lifetime: [4, 8], size: [0.14, 0.05],
                    alpha: [0.95, 0], light: "full", maxParticles: 30
                },
                {
                    name: "wake", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/smallleaf",
                    trail: { minDistance: 0.3 }, rate: 12,
                    direction: "velocity", speed: [0.02, 0.08], spread: 24,
                    gravity: 0.03, drag: 0.94,
                    lifetime: [5, 10], size: [0.08, 0.02],
                    color: 0xB6D26A, alpha: [0.55, 0], light: "world", maxParticles: 34
                }
            ]
        },
        hit: {
            duration: 16,
            exit: { stop: 7, drain: 11 },
            emitters: [
                {
                    name: "burst", bind: "point", fit: "none", offset: [0, 0.45, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: { data: "husk", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.22], spread: 24,
                    lifetime: [5, 10], size: [0.24, 0.05], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 44
                },
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.42, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: { data: "shot", fallback: 1 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.07, drag: 0.93,
                    lifetime: [9, 16], size: [0.1, 0.03],
                    alpha: [0.9, 0], light: "full", maxParticles: 30
                },
                {
                    name: "powder", bind: "point", fit: "none", offset: [0, 0.4, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.03, 0.13], gravity: 0.05, drag: 0.9,
                    lifetime: [8, 14], size: [0.05, 0.02],
                    color: 0xC9C07A, alpha: [0.45, 0], light: "world", maxParticles: 24
                }
            ]
        },
        husk: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "fallen", bind: "point", fit: "none", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/grass/xsseed",
                    burst: { count: { data: "husk", fallback: 14 }, at: 0 },
                    shape: { kind: "circle", radius: 0.6 },
                    direction: "outward", speed: [0.03, 0.14], gravity: 0.07, drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xC9C07A, alpha: [0.7, 0], light: "world", maxParticles: 60
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "circle", radius: 0.55 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [9, 16], size: [0.05, 0.02],
                    color: 0xA89B5E, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bulletseed", 1, BulletseedDefinition);
