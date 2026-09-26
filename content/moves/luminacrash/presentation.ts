/**
 * 琉光冲激 / luminacrash —— 客户端表现。
 *
 * 一句话：施法者头顶聚起怪光 → 目标头顶点起一根怪光柱、地面浮出一圈虚的落点环 → 坠落前段光柱跟住目标、落点环跟着移动
 * → 最后锚环由虚变实、光柱往下一路压到锚点 → 砸出光圈，目标身上残留怪光残影。
 * 色相家族：精神怪光的紫（0xB7A8FF）与冷星青（0x8FE8FF），近白只给砸中的一下。
 * 拍子：起 windup（聚光）→ 落 charge（空中点光，跟随）→ 标 mark（地面虚环跟随）→ 锁 lock（地面实环，锚点冻结）→ 坠 fall（光柱下压）
 *   → 砸 impact（只在最终锚点炸开）→ 击 hit／残 dazzle／旁 splash_hit。
 * 范围：impact 的炸落圈半径绑定 `data.burst`，光柱粗细绑定 `data.radius`，mark/lock 的地面环同样绑 `data.burst`。
 * 运动：charge/fall 使用服务端同步的真实锚点（同一位置与阶段数据）；mark/lock 在锚点地面，lock 表示已锁点。
 * 数：光束数绑定 `data.rays`（特攻与等级换算），强弱绑定 `data.intensity`（光柱威力 / 68）。
 */
const LuminaCrashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "mind_glow", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 12, shape: { kind: "sphere", radius: 0.34 },
                    direction: "inward", speed: [0.03, 0.12], spin: 20,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xB7A8FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 24
                },
                {
                    name: "mind_spark", bind: "source", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x8FE8FF, alpha: [0.8, 0], light: "full", maxParticles: 16
                }
            ]
        },
        charge: {
            duration: 12,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "sky_gather", bind: "point", fit: "none", offset: [0, -0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "rays", fallback: 10 }, shape: { kind: "sphere", radius: 0.9 },
                    direction: "inward", speed: [0.05, 0.2],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8FE8FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "sky_core", bind: "point", fit: "none", offset: [0, -0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 14, shape: { kind: "sphere", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.1], spin: 24,
                    lifetime: [10, 18], size: [0.24, 0.04],
                    color: 0xB7A8FF, alpha: [0.95, 0], light: "full", bloom: 0.5, maxParticles: 30
                }
            ]
        },
        mark: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "mark_ring", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 4, shape: { kind: "ring", radius: { data: "burst", fallback: 2.0 } },
                    direction: "up", speed: [0.0, 0.01], spin: 4,
                    lifetime: [8, 14], size: [0.3, 0.5], sizeMode: "sin",
                    color: 0x8FE8FF, alpha: [0.22, 0.02], light: "full", maxParticles: 12
                }
            ]
        },
        lock: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "lock_ring", bind: "point", fit: "none", offset: [0, 0.07, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "burst", fallback: 2.0 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 18], size: [0.34, 0.7],
                    color: 0xB7A8FF, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 8
                },
                {
                    name: "lock_seal", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: { data: "rays", fallback: 10 }, shape: { kind: "circle", radius: { data: "burst", fallback: 2.0 } },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFFFFFF, alpha: [0.6, 0], light: "full", maxParticles: 40
                }
            ]
        },
        fall: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "pillar_body", bind: "point", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "rays", fallback: 10 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 0.9 }, length: { data: "height", fallback: 9 } },
                    direction: "down", speed: [0.35, 0.9], spin: 30,
                    lifetime: [8, 14], size: [0.18, 0.03],
                    color: 0xB7A8FF, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 140
                },
                {
                    name: "pillar_dust", bind: "point", fit: "none", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: { data: "rays", fallback: 10 },
                    shape: { kind: "cylinder", radius: { data: "radius", fallback: 0.9 }, length: { data: "height", fallback: 9 } },
                    direction: "down", speed: [0.4, 1.1],
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0x8FE8FF, alpha: [0.7, 0], light: "full", maxParticles: 160
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "impact_ring", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "burst", fallback: 2.0 } },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 18], size: [0.4, 1.1],
                    color: 0xB7A8FF, alpha: [0.8, 0], light: "full", bloom: 0.5, maxParticles: 8
                },
                {
                    name: "impact_rays", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "rays", fallback: 10 } },
                    shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.18, 0.5], spread: 16,
                    lifetime: [8, 16], size: [0.13, 0.02],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 60
                },
                {
                    name: "impact_shock", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "point" },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.36, 0.7], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 6
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "hit_flare", bind: "target", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 8, size: [0.28, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 6
                },
                {
                    name: "hit_spark", bind: "target", offset: [0, 0.55, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "rays", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0x8FE8FF, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        splash_hit: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "splash_glow", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "rays", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.2],
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xB7A8FF, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        dazzle: {
            duration: 120,
            exit: { stop: 20, drain: 26 },
            emitters: [
                {
                    name: "dazzle_ring", bind: "target", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 3, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.0, 0.02], spin: 5,
                    lifetime: [14, 26], size: [0.12, 0.02],
                    color: 0xB7A8FF, alpha: [0.5, 0.05], light: "full", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_luminacrash", 1, LuminaCrashDefinition);
