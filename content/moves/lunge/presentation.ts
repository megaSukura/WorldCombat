/**
 * 猛扑 / lunge 的客户端表现。
 *
 * 一句话：施法者后腿一压、甲壳碎屑向身下收紧 → 整个人贴着地面扑出去，拖出一条青黄风痕 → 撞上的那一下
 *   炸开一圈酸绿甲壳与碎屑，把目标压得矮下去（攻击下降）。
 * 色相家族：虫系的酸绿与甲壳黄（0x9ACD32 主体、0xD8E86A 亮面），击点用近白核心，余韵用中性尘灰。
 * 拍子：蓄 coil 0–8t ／ 扑 leap ／ 撞 crash ／ 压 pin ／ 空 miss。
 * 范围：crash／pin 绑目标点，半径按 `data.scale`（判定半径 / 0.5）缩放；leap 是一条沿 `data.direction` 的风痕。
 * 运动：coil 的碎屑向身下收；leap 的风痕沿扑进方向拖尾；crash 的甲壳从目标表面向外炸、碎屑受重力下落。
 * 数：`data.chitin`（物攻与速度派生的甲壳数）驱动 coil／leap／crash 发射量，`data.stages`（掉攻级数）决定
 *   pin 的压环重放，`data.intensity`（威力 / 70）抬高命中密度。
 */
const LungeSceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        coil: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 4, drain: 10 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.25, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "chitin", fallback: 14 }, shape: { kind: "ring", radius: 0.55 },
                    direction: "inward", speed: [0.06, 0.2], spin: 16,
                    lifetime: [6, 12], size: [0.12, 0.02], sizeMode: "sin",
                    color: 0x9ACD32, alpha: [0.7, 0], light: "full", maxParticles: 80
                },
                {
                    name: "dust", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [6, 11], size: [0.07, 0.02],
                    color: 0xC9CFD6, alpha: [0.45, 0], light: "world", maxParticles: 50
                }
            ]
        },
        leap: {
            duration: 14,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "dashline", bind: "source", offset: [0, 0.4, 0], height: 0.35, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 36, trail: { minDistance: 0.24 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0.02, 0.08], spin: 8,
                    lifetime: [4, 8], size: [0.24, 0.07], sizeMode: "index",
                    color: 0xd8e86a, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.3, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "chitin", fallback: 14 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "velocity", speed: [0.05, 0.2], spread: 24, gravity: 0.03,
                    lifetime: [5, 10], size: [0.08, 0.01],
                    color: 0x9ACD32, alpha: [0.85, 0], light: "full", maxParticles: 70
                }
            ]
        },
        crash: {
            duration: 28,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.5, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "chitin", fallback: 16 }, at: 0 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.12, 0.34],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xffffff, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 70
                },
                {
                    name: "shell", bind: "target", offset: [0, 0.45, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/spike",
                    burst: { count: { data: "chitin", fallback: 16 }, interval: 2 },
                    shape: { kind: "sphere_surface", radius: 0.38 },
                    direction: "outward", speed: [0.14, 0.36], gravity: 0.05, spin: 20,
                    lifetime: [7, 13], size: [0.11, 0.02],
                    color: 0x9ACD32, alpha: [0.9, 0], light: "world", maxParticles: 60
                },
                {
                    name: "shock", bind: "target", offset: [0, 0.08, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, at: 0 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.16, 0.36],
                    lifetime: [8, 14], size: [0.36, 0.8], sizeMode: "sin",
                    color: 0xd8e86a, alpha: [0.6, 0], light: "world", maxParticles: 8
                }
            ]
        },
        pin: {
            duration: 24,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "press", bind: "target", offset: [0, 0.12, 0], height: 0, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: { data: "stages", fallback: 1 }, interval: 2 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1 } },
                    direction: "inward", speed: [0.12, 0.3],
                    lifetime: [9, 16], size: [0.42, 0.9], sizeMode: "sin",
                    color: 0x9ACD32, alpha: [0.6, 0], light: "full", maxParticles: 18
                },
                {
                    name: "sink", bind: "target", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "chitin", fallback: 12 }, interval: 2 },
                    shape: { kind: "hemisphere", radius: 0.4 },
                    direction: "down", speed: [0.03, 0.12], gravity: 0.04,
                    lifetime: [10, 16], size: [0.08, 0.02],
                    color: 0xC9CFD6, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "skid", bind: "source", offset: [0, 0.18, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "chitin", fallback: 12 } }, shape: { kind: "hemisphere", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.12], gravity: 0.05,
                    lifetime: [10, 17], size: [0.08, 0.02],
                    color: 0xC9CFD6, alpha: [0.4, 0], light: "world", maxParticles: 44
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lunge", 1, LungeSceneDefinition);
