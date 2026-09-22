/**
 * 恶之波动 / darkpulse 的客户端表现。
 *
 * 一句话：暗气在胸口被逼成一团 → 一团黑气脱手、沿直线铺出一条碎缕尾迹 → 抵达时炸开成一圈恶意领域、
 * 每个被罩住的人身上卷起黑烟 → 落点残留一小阵不散的暗雾；被恐惧攥住的人头上晃星。
 * 色相家族：暗紫与黑（largesmokeorb / impact_dark / obscuringsmoke / largering）为主体，亮紫只在碎缕与核心强调。
 * 拍子：起 windup（聚恶）→ 行 release/travel（脱手与飞行）→ 爆 burst（炸开）→ 罩 veil（附身）→ 收 linger（余韵）。
 * 范围：burst 的领域半径与 linger 的存活都按 `data.scale`（气场半径 / 3 格）铺开，画面就是机制那块领域。
 * 运动：travel 绑 projectile 沿直线拖尾；release 的气环朝向 `data.direction`；burst 碎缕带初速外抛。
 * 数：`data.motes`（特攻与等级派生）决定飞行尾迹、炸开碎缕与余韵的密度，`data.count`（威力派生）决定强调帧数，
 *   `data.intensity` 抬高亮度。
 */
const DarkPulseDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 20,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "gather_core", bind: "source", offset: [0, 0.32, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    rate: 16, shape: { kind: "sphere", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.22, 0.03],
                    color: 0x2A1B3D, alpha: [0.85, 0], light: "world", maxParticles: 28
                },
                {
                    name: "gather_motes", bind: "source", offset: [0, 0.32, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 14, shape: { kind: "sphere", radius: 0.48 },
                    direction: "inward", speed: [0.02, 0.08], spin: 8,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x9A7BFF, alpha: [0.8, 0], light: "full", maxParticles: 28
                }
            ]
        },
        release: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "muzzle", bind: "source", offset: [0, 0.32, 0], height: 0.55, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [8, 14], size: [0.3, 0.9],
                    color: 0x4A2C6B, alpha: [0.75, 0], light: "world", maxParticles: 6
                },
                {
                    name: "surge", bind: "source", offset: [0, 0.32, 0], height: 0.55, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 10 },
                    shape: { kind: "cone", radius: 0.3, angleDegrees: 22 },
                    direction: "outward", speed: [0.05, 0.2], spread: 18,
                    lifetime: [8, 16], size: [0.2, 0.04],
                    color: 0x2A1B3D, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        travel: {
            duration: 100,
            exit: { stop: 80, drain: 16 },
            emitters: [
                {
                    name: "core", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    rate: 34, shape: { kind: "sphere", radius: 0.2 },
                    direction: "velocity", speed: [0.0, 0.03],
                    lifetime: [6, 12], size: [0.26, 0.05],
                    color: 0x2A1B3D, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "wisps", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.3 }, rate: { data: "motes", fallback: 20 },
                    direction: "away", speed: [0.0, 0.06], spread: 24,
                    lifetime: [6, 14], size: [0.07, 0.01],
                    color: 0x7A5FA0, alpha: [0.6, 0], light: "full", maxParticles: 90
                }
            ]
        },
        burst: {
            duration: 30,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "impact", bind: "point", fit: "none", offset: [0, 0.25, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 4, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.38, 0.05], sizeMode: "index",
                    color: 0xC9B3F0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 10
                },
                {
                    name: "field", bind: "point", fit: "none", offset: [0, 0.18, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [12, 20], size: [0.4, 1.0],
                    color: 0x4A2C6B, alpha: [0.7, 0], light: "world", maxParticles: 6
                },
                {
                    name: "shards", bind: "point", fit: "none", offset: [0, 0.22, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.2], spread: 30,
                    gravity: 0.02, drag: 0.9,
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0x7A5FA0, alpha: [0.7, 0], light: "full", maxParticles: 110
                }
            ]
        },
        veil: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "veil_smoke", bind: "target", offset: [0, 0.1, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "motes", fallback: 8 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 20], size: [0.18, 0.04],
                    color: 0x2A1B3D, alpha: [0.55, 0], light: "world", maxParticles: 18
                }
            ]
        },
        linger: {
            duration: 140,
            exit: { stop: 20, drain: 30 },
            emitters: [
                {
                    name: "pool", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "motes", fallback: 6 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.0, 0.02],
                    lifetime: [16, 30], size: [0.26, 0.05],
                    color: 0x2A1B3D, alpha: [0.35, 0], light: "world", maxParticles: 26
                },
                {
                    name: "embers", bind: "point", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle", spriteFrom: "age",
                    rate: 3, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [12, 22], size: [0.05, 0.01],
                    color: 0x7A5FA0, alpha: [0.5, 0], light: "full", maxParticles: 12
                }
            ]
        },
        flinch: {
            duration: 26,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "stagger", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [12, 18], size: [0.15, 0.04],
                    color: 0xFFF6D8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_darkpulse", 1, DarkPulseDefinition);
