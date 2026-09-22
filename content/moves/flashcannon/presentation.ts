/**
 * 加农光炮 / flashcannon —— 客户端表现。
 *
 * 一句话：全身的光被一束束收进身前一点、越收越亮 → 一条高速光矛沿准线射出、拖着一条亮尾 → 命中处炸开
 * 钢白冲击与火星；光矛继续穿过后面的人，每人身上再炸一下；撞墙只留散光。
 * 色相家族：冷钢白（0xBFE8FF）为主，近白（0xF2FAFF）只给矛尖与击点，钢灰（0x4E6A80）做余韵。
 * 拍子：起 converge（收光）→ 行 travel（射出）→ 击 hit（逐个命中）／散 fizzle。
 * 范围：单发直线点射（命中 100、不偏线），由 travel 的轨迹读出；贯穿时同一道矛继续向后。
 * 运动：光束 `inward` 收进矛心；光矛以服务端速度沿准线飞出并穿过目标。
 * 数：converge／hit 的光束数绑定 `data.beams`（特攻与等级换算），强度绑定 `data.intensity`（该次命中威力 / 80）。
 */
const FlashCannonDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        converge: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "converge_beams", bind: "source", offset: [0, 0.3, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/smallbeam",
                    rate: 30, shape: { kind: "sphere", radius: 0.6 },
                    direction: "inward", speed: [0.12, 0.4],
                    lifetime: [5, 11], size: [0.3, 0.03], sizeMode: "index",
                    color: 0xBFE8FF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "converge_motes", bind: "source", offset: [0, 0.3, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 20, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xF2FAFF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "converge_ring", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, repeats: 3, interval: 5 },
                    shape: { kind: "ring", radius: 0.26 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.2, 0.42],
                    color: 0x8EA9BF, alpha: [0.55, 0], light: "world", maxParticles: 12
                }
            ]
        },
        travel: {
            duration: 100,
            exit: { stop: 80, drain: 14 },
            emitters: [
                {
                    name: "lance_core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 48, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [5, 10], size: [0.3, 0.05],
                    color: 0xF2FAFF, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 48
                },
                {
                    name: "lance_trail", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.22 }, rate: 34,
                    direction: "away", speed: [0.0, 0.06], spread: 16,
                    lifetime: [5, 12], size: [0.06, 0.01],
                    color: 0xBFE8FF, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 8, drain: 18 },
            emitters: [
                {
                    name: "hit_impact", bind: "target", offset: [0, 0.15, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.36, 0.05], sizeMode: "index",
                    color: 0xF2FAFF, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 8
                },
                {
                    name: "hit_sparks", bind: "target", offset: [0, 0.2, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "beams", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.32], spread: 30,
                    gravity: 0.04, drag: 0.92,
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xBFE8FF, alpha: [0.85, 0], light: "full", maxParticles: 90
                },
                {
                    name: "hit_ring", bind: "target", offset: [0, 0.25, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [9, 16], size: [0.26, 0.6],
                    color: 0x4E6A80, alpha: [0.65, 0], light: "world", maxParticles: 6
                }
            ]
        },
        fizzle: {
            duration: 20,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "fizzle_flash", bind: "point", offset: [0, 0.3, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.05, 0.2], spread: 30,
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0xBFE8FF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 26
                },
                {
                    name: "fizzle_dust", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.14], spread: 24, gravity: 0.03,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x8EA9BF, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_flashcannon", 1, FlashCannonDefinition);
