/**
 * 能量球 / energyball —— 客户端表现。
 *
 * 一句话：四周草木的生机被一缕缕吸向施法者身前、聚成一团发亮的草能球 → 沿直线飞出、一路抛落草叶与光尘 →
 * 命中活物时炸开成一圈草种与光点，并在地面绽出一小片花草；打空也只留绽开。
 * 色相家族：草绿（0x7FBF3A / 0x8FD14A）为主，嫩绿高光（0xEFFFC8）只给球心与击点，暗绿（0x3E6B2A）做余韵。
 * 拍子：起 gather（吸生机）→ 行 travel（飞行）→ 击 burst（炸开）→ 绽 bloom（落地生长）／空 fizzle。
 * 范围：单发点射，由 travel 的直线轨迹读出；gather 用 `data.gather` 画出吸取半径。
 * 运动：生机从四面 `inward` 汇入球心；球沿直线飞出（服务端速度），草种向外抛洒。
 * 数：burst／bloom 的种子数绑定 `data.seeds`（特攻与等级换算），强度绑定 `data.intensity`（总威力 / 90）。
 */
const EnergyBallDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "gather_in", bind: "source", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    rate: 22, shape: { kind: "circle", radius: { data: "gather", fallback: 3.4 }, thickness: 0.9 },
                    direction: "inward", speed: [0.06, 0.22], spread: 10, spin: 6,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0x7FBF3A, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "gather_motes", bind: "source", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 18, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xEFFFC8, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "leaves", bind: "source", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    rate: 10, shape: { kind: "circle", radius: { data: "gather", fallback: 3.4 }, thickness: 0.6 },
                    direction: "inward", speed: [0.04, 0.14], spin: 14,
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0x6FA83A, alpha: [0.7, 0], light: "world", maxParticles: 40
                }
            ]
        },
        travel: {
            duration: 100,
            exit: { stop: 80, drain: 16 },
            emitters: [
                {
                    name: "orb_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 44, shape: { kind: "sphere", radius: 0.18 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 12], size: [0.3, 0.06],
                    color: 0x8FD14A, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 48
                },
                {
                    name: "orb_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/leaf",
                    trail: { minDistance: 0.34 }, rate: 26,
                    direction: "away", speed: [0.0, 0.08], spread: 26, spin: 16,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x6FA83A, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 28,
            exit: { stop: 10, drain: 20 },
            emitters: [
                {
                    name: "burst_impact", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_grass",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.34, 0.05], sizeMode: "index",
                    color: 0xEFFFC8, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 8
                },
                {
                    name: "burst_seeds", bind: "target", offset: [0, 0.15, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "seeds", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], spread: 32, spin: 20,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 20], size: [0.09, 0.01],
                    color: 0x7FBF3A, alpha: [0.8, 0], light: "world", maxParticles: 110
                },
                {
                    name: "burst_ring", bind: "target", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [10, 18], size: [0.28, 0.6],
                    color: 0x3E6B2A, alpha: [0.7, 0], light: "world", maxParticles: 6
                }
            ]
        },
        bloom: {
            duration: 34,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "bloom_sprout", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/sprout",
                    burst: { count: { data: "planted", fallback: 5 }, at: 1 },
                    shape: { kind: "circle", radius: 0.9 },
                    direction: "up", speed: [0.05, 0.2], spread: 14,
                    lifetime: [14, 26], size: [0.22, 0.06],
                    color: 0x7FBF3A, alpha: [0.9, 0], light: "world", maxParticles: 30
                },
                {
                    name: "bloom_seeds", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "seeds", fallback: 18 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14], spread: 30, spin: 18,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [12, 24], size: [0.07, 0.01],
                    color: 0x8FD14A, alpha: [0.7, 0], light: "world", maxParticles: 100
                },
                {
                    name: "bloom_motes", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 6, start: 0, stop: 18,
                    shape: { kind: "circle", radius: 0.8 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [12, 22], size: [0.06, 0.01],
                    color: 0xEFFFC8, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 7, drain: 16 },
            emitters: [
                {
                    name: "fizzle_smoke", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.2, 0.04],
                    color: 0x5A7A44, alpha: [0.45, 0], light: "world", maxParticles: 24
                },
                {
                    name: "fizzle_seeds", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "seeds", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.12], spread: 30, spin: 16,
                    gravity: 0.03,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x7FBF3A, alpha: [0.6, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_energyball", 1, EnergyBallDefinition);
