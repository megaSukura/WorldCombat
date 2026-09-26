/**
 * 祸不单行 / hex 的客户端表现。
 *
 * 一句话：掐指凝咒、在起手锁定的落点先亮一枚记号 → 一枚鬼火头沿真实投射路径飞到那里 → 铺开一圈符文结界，
 *   然后一波接一波从圈里向上涌出鬼影尖刺；带异常的目标那一波更亮更密。
 * 色相家族：幽紫一族（0x4A2E8A 主体 / 0x8A6BE0 棘与环 / 0xC9B6FF 只做细碎高光，烟尘近黑 0x241E38）。
 * 拍子：起 coil（凝咒）／mark（锁定落点记号）→ 咒 cast（鬼火头飞行）→ 落 sigil（结界成形）→ 驻 hum（持续符文）
 *   → 击 burst × waves（一波波涌刺）／spike（命中者身上）→ 收 miss（无承载面或传送被截则散去）。
 * 范围：mark/sigil/hum/burst 都按服务端 `data.radius` 画在同一落点——圈画多大、判定就是多大；cast 绑真实 projectile。
 * 运动：鬼火头沿实际投射路径飞；尖刺从地下朝上涌起，一波接一波按时序脉冲。
 * 数：每波涌出的棘数绑定 `data.spikes`（由结界半径派生）、波数绑定 `data.waves`（机制波数），
 *   命中强度绑定 `data.intensity`（该目标**解析后**的咒力，含状态翻倍），带异常者的 `data.blighted` 让那一波更亮。
 * 参照节：视觉语言第二、三、四、六、九节。
 */
const HexDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: 10,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "sigil_draft", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 14, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0x8A6BE0, alpha: [0.7, 0], light: "full", maxParticles: 36
                },
                {
                    name: "chant", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 16], size: [0.07, 0.02],
                    color: 0xC9B6FF, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        mark: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "mark_ring", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 }, thickness: 0.7 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [12, 20], size: [0.3, 0.6], sizeMode: "linear",
                    color: 0x8A6BE0, alpha: [0.55, 0], light: "full", maxParticles: 6
                },
                {
                    name: "mark_script", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 22, shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 }, thickness: 0.85 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 15], size: [0.07, 0.02],
                    color: 0xC9B6FF, alpha: [0.6, 0], light: "full", maxParticles: 80
                }
            ]
        },
        cast: {
            duration: 60,
            exit: { stop: 1, drain: 10 },
            emitters: [
                {
                    name: "head", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 26, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0x8A6BE0, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 50
                },
                {
                    name: "trail", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 20, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [10, 18], size: [0.2, 0.07],
                    color: 0x241E38, alpha: [0.4, 0], light: "world", maxParticles: 60
                },
                {
                    name: "sparks", bind: "projectile", offset: [0, 0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 10, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.01, 0.06],
                    lifetime: [6, 12], size: [0.07, 0.02],
                    color: 0xC9B6FF, alpha: [0.8, 0], light: "full", maxParticles: 30
                }
            ]
        },
        sigil: {
            duration: 22,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "sigil_ring", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/warblingring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 }, thickness: 0.95 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [14, 24], size: [0.5, 0.9], sizeMode: "linear",
                    color: 0x8A6BE0, alpha: [0.65, 0], light: "full", maxParticles: 8
                },
                {
                    name: "sigil_script", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 40, shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 }, thickness: 0.85 },
                    direction: "up", speed: [0.01, 0.06],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xC9B6FF, alpha: [0.7, 0], light: "full", maxParticles: 120
                }
            ]
        },
        hum: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hum_ring", bind: "point", offset: [0, 0.05, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/flat",
                    rate: 30, shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 }, thickness: 0.9 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0x4A2E8A, alpha: [0.5, 0], light: "full", maxParticles: 90
                },
                {
                    name: "hum_script", bind: "point", offset: [0, 0.06, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 18, shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 }, thickness: 0.8 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.06, 0.02],
                    color: 0xC9B6FF, alpha: [0.4, 0], light: "full", maxParticles: 70
                }
            ]
        },
        burst: {
            duration: 14,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "spikes", bind: "point", offset: [0, 0.0, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "spikes", fallback: 10 }, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 1.4 }, thickness: 0.8 },
                    direction: "up", speed: [0.12, 0.4],
                    lifetime: [8, 15], size: [0.24, 0.05], sizeMode: "index",
                    color: 0x8A6BE0, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 200
                },
                {
                    name: "ground_glow", bind: "point", offset: [0, 0.04, 0], fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    rate: 30, shape: { kind: "circle", radius: { data: "radius", fallback: 1.5 }, thickness: 0.75 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [10, 16], size: [0.18, 0.04],
                    color: 0x4A2E8A, alpha: [0.5, 0], light: "full", maxParticles: 80
                }
            ]
        },
        spike: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "hit_spike", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.14, 0.42],
                    lifetime: [7, 13], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xC9B6FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "hit_shards", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.08, 0.28],
                    gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.06, 0.01],
                    color: 0x8A6BE0, alpha: [0.9, 0], light: "full", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fizzle", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 16], size: [0.18, 0.03],
                    color: 0x4A2E8A, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_hex", 1, HexDefinition);
