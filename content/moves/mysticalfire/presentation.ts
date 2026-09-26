/**
 * 魔法火焰 / mysticalfire —— 客户端表现。
 *
 * 一句话：喉间收拢一枚火团 → 火团脱手、拐着弯追上目标 → 命中炸开 → 火焰绕着目标盘成一圈、随缠身进度一截截收紧，
 * 最后猛地收束抽走特攻，或者目标跑远／状态被清除时散开。
 * 色相家族：魔法紫粉（0xE060C0）与焰心暖橙（0xFFB35A），中性白只给命中强调。
 * 拍子：起 windup（聚火）→ 追 cast（真弹体拖尾）→ 击 hit（命中炸开）→ 缠 wrap（绕身盘住、按进度收圈）→ 咬 coil（每跳）
 *   → 收 siphon / 散 slip；打在方块或没有敌人时走 fizzle。
 * 范围：火团拖尾绑定真弹体（data.projectile）；缠火绑定实际目标（data.target）。
 * 运动：火团沿同步的投射物锚点飞；缠焰绕目标做环状公转，`data.ring` 随进度收拢。
 * 数：火粒数绑定 `data.wisps`（特攻与等级换算），强弱绑定 `data.intensity`（火团威力 / 70）。
 */
const MysticalFireDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "charge_ember", bind: "source", offset: [0, 0.3, 0], height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 18, shape: { kind: "sphere", radius: 0.42 },
                    direction: "inward", speed: [0.04, 0.14],
                    lifetime: [8, 15], size: [0.14, 0.02],
                    color: 0xE060C0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 30
                },
                {
                    name: "charge_core", bind: "source", offset: [0, 0.3, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.1], spin: 14,
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xFFB35A, alpha: [0.9, 0], light: "full", maxParticles: 20
                }
            ]
        },
        cast: {
            duration: 60,
            exit: { stop: 20, drain: 14 },
            emitters: [
                {
                    name: "cast_seed", bind: "projectile", offset: [0, 0.25, 0], trail: { minDistance: 0.22 },
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: { data: "wisps", fallback: 12 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.02, 0.12], spread: 14,
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0xE060C0, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "cast_sparks", bind: "projectile", offset: [0, 0.25, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: 2, interval: 2, repeats: 12 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.1], spread: 24,
                    lifetime: [6, 12], size: [0.08, 0.02],
                    color: 0xFFB35A, alpha: [0.8, 0], light: "full", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "hit_burst", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 8, size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 6
                },
                {
                    name: "hit_wisps", bind: "target", offset: [0, 0.15, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: { data: "wisps", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.3], gravity: -0.01,
                    lifetime: [10, 20], size: [0.12, 0.02],
                    color: 0xFFB35A, alpha: [0.9, 0], light: "full", maxParticles: 50
                }
            ]
        },
        wrap: {
            duration: 60,
            exit: { stop: 16, drain: 24 },
            emitters: [
                {
                    name: "wrap_orbit", bind: "target", offset: [0, 0.45, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    rate: 14,
                    shape: { kind: "point" },
                    velocity: { x: "0.09*cos(t*6.283)", z: "0.09*sin(t*6.283)", y: "0.01" },
                    lifetime: [12, 20], size: [0.12, 0.02],
                    color: 0xE060C0, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "wrap_ring", bind: "target", offset: [0, 0.35, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 3, shape: { kind: "ring", radius: { data: "ring", fallback: 0.6 } },
                    direction: "outward", speed: [0.0, 0.03], spin: 6,
                    lifetime: [12, 22], size: [0.24, 0.34], sizeMode: "sin",
                    color: 0xFFB35A, alpha: [0.35, 0.05], light: "full", maxParticles: 10
                }
            ]
        },
        coil: {
            duration: 22,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "coil_bite", bind: "target", offset: [0, 0.35, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "wisps", fallback: 12 } },
                    shape: { kind: "circle", radius: 0.44 },
                    direction: "outward", speed: [0.06, 0.2], gravity: -0.012,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xFFB35A, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        siphon: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "siphon_flare", bind: "target", offset: [0, 0.5, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [10, 20], size: [0.4, 0.9],
                    color: 0xE060C0, alpha: [0.7, 0], light: "full", bloom: 0.5, maxParticles: 8
                },
                {
                    name: "siphon_motes", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/shinesparkle_rainbow",
                    burst: { count: { data: "wisps", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.15, 0.4], gravity: 0.01,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFFB35A, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 50
                }
            ]
        },
        slip: {
            duration: 22,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "slip_smoke", bind: "target", offset: [0, 0.3, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "wisps", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.16], gravity: -0.01,
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0x9A6A9A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "fizzle_puff", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.14], gravity: -0.01,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x9A6A9A, alpha: [0.5, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mysticalfire", 1, MysticalFireDefinition);
