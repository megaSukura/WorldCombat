/**
 * 精神击破 / psystrike 的客户端表现。
 *
 * 一句话：施法者周身念力上涌、标记点上方压出一圈下压的印记 → 一整块深紫重物从标记点正上方竖直砸落、拖着下坠的光屑 →
 *   在真实撞点（实体或方块）炸成一圈白边冲击面与飞散的碎块；被砸伤的目标身上再闪过一道裂特防的紫纹。
 * 色相家族：深紫蓝（0x6A3FD0 主 / 0x9B7BEE 亮 / 0xE4D8FF 近白核心），近白只给砸落的核心与冲击面；无第二个色相。
 * 拍子：起 conjure 0–22t ／ 标记 mark ／ 落 descend 0–80t ／ 砸 crush 0–30t ／ 裂 sunder ／ 场 shock ／ 空 miss。
 * 范围：crush 的贴地大环与 shock 的外扩环都按 `data.scale`（判定半径 / 0.5）铺开，就是这一压盖住的那块地方。
 * 运动：conjure 向上涌；mark 的印记固定在标记点缓缓下压；descend 绑 projectile 沿下落方向甩出下坠的光屑；
 *   crush 在真实撞点由内向外炸、碎块受重力落下；shock 环贴地向外扩。
 * 数：`data.cracks`（特攻与等级派生的碎裂数）驱动砸落与冲击的碎块量，`data.intensity`（重压威力派生）抬高亮度。
 */
const PsystrikeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        conjure: {
            duration: { data: "windup", fallback: 16 },
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "rise", bind: "source", offset: [0, 0.2, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 22, shape: { kind: "sphere", radius: 0.42 },
                    direction: "up", speed: [0.04, 0.16],
                    lifetime: [8, 16], size: [0.24, 0.04], sizeMode: "sin",
                    color: 0x6A3FD0, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "core", bind: "source", offset: [0, 0.3, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.2, 0.03],
                    color: 0xC9B4F5, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        mark: {
            duration: 34,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "seal", bind: "point", offset: [0, 1.4, 0], height: 0.4, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: 5, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.01, 0.05], spin: 8,
                    lifetime: [12, 20], size: [0.26, 0.46],
                    color: 0x9B7BEE, alpha: [0.55, 0], light: "full", maxParticles: 14
                },
                {
                    name: "weight", bind: "point", offset: [0, 0.6, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "cracks", fallback: 18 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.24, 0.05],
                    color: 0x4A2FA0, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        },
        descend: {
            duration: 90,
            exit: { stop: 80, drain: 16 },
            emitters: [
                {
                    name: "mass", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 40, shape: { kind: "sphere", radius: 0.3 },
                    direction: "velocity", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.3, 0.06],
                    color: 0x6A3FD0, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "fall", bind: "projectile", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    trail: { minDistance: 0.4 }, rate: { data: "cracks", fallback: 18 },
                    direction: "up", speed: [0.02, 0.12], spread: 20,
                    lifetime: [8, 16], size: [0.1, 0.01],
                    color: 0xB49CF0, alpha: [0.8, 0], light: "full", maxParticles: 100
                }
            ]
        },
        crush: {
            duration: 30,
            exit: { stop: 12, drain: 20 },
            emitters: [
                {
                    name: "core", bind: "point", offset: [0, 0.16, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: 10, size: [0.44, 0.06], sizeMode: "index",
                    color: 0xE4D8FF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 12
                },
                {
                    name: "shock_ring", bind: "point", offset: [0, -0.5, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.0 } },
                    direction: "outward", speed: [0.18, 0.5],
                    lifetime: [12, 20], size: [0.5, 1.3],
                    color: 0x6A3FD0, alpha: [0.7, 0], light: "full", maxParticles: 5
                },
                {
                    name: "debris", bind: "point", offset: [0, 0.24, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "cracks", fallback: 20 }, interval: 1, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.12, 0.4], spread: 28, gravity: 0.035, drag: 0.92,
                    lifetime: [9, 18], size: [0.1, 0.01],
                    color: 0x9B7BEE, alpha: [0.9, 0], light: "full", maxParticles: 120
                }
            ]
        },
        sunder: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "crack", bind: "target", offset: [0, 0.2, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 2, interval: 3 },
                    shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2],
                    lifetime: [10, 16], size: [0.26, 0.54],
                    color: 0xC77DFF, alpha: [0.7, 0], light: "full", maxParticles: 10
                }
            ]
        },
        shock: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "wave", bind: "point", fit: "none", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/largering2",
                    burst: { count: 2, interval: 3 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.8 } },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [10, 18], size: [0.4, 0.9],
                    color: 0x8A5CFF, alpha: [0.6, 0], light: "full", maxParticles: 8
                },
                {
                    name: "grit", bind: "point", fit: "none", offset: [0, 0.2, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "cracks", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.02, drag: 0.92,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0x9B7BEE, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "fade", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 16], size: [0.18, 0.02],
                    color: 0x5A3B78, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_psystrike", 1, PsystrikeDefinition);
