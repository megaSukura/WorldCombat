/**
 * 百万吨重踢 / megakick 的客户端表现。
 *
 * 一句话：施法者把一条腿高抬后撤、身体后仰，尘点向脚下收拢 → 整身贴地撞出去，身后拖出速度线与土屑 →
 * 命中点爆开一记钝击与一只外冲的脚影 → 被踢中的人被抛飞出去、沿下坠方向拖出一条尘线。
 * 色相家族：暖土褐（earth / tinydust）与暖金钝击（impact_fighting / foot）为主，速度线为浅米色，无饱和色。
 * 拍子：起 haul（抬腿收尘）→ 行 drive（俯冲撞出）→ 击 impact（钝击与脚影）→ 飞 launch（目标离地拖尾）→ 空 whiff（踢空扬尘）。
 * 范围：impact 落在消息位置（命中点或收势落点），画出的就是踢中的位置；这是一记直线单体招，弧面与地面不带持续区域。
 * 运动：drive 沿瞄准方向拖出速度线（`orient: "direction"` 读载荷方向），落地尘向外炸；launch 的尘沿目标被抛飞的方向拖出一条抛物线。
 * 数：drive 起步尘量绑 `data.stride`（突进距离派生）；impact 的尘与脚影用整数基数，由 `data.intensity`（本击威力 / 110）自动缩放；
 *     launch 的离地速度线用整数基数——画面里的数量与机制里的数一致。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const MegaKickDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        haul: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "plant", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 16, shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x9A7B45, alpha: [0.55, 0], light: "world", maxParticles: 50
                },
                {
                    name: "coil", bind: "source", offset: [0, 0.7, 0], height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 12], size: [0.06, 0.01],
                    color: 0xE8A24A, alpha: [0.45, 0], light: "full", maxParticles: 40
                },
                {
                    name: "draw", bind: "source", offset: [0, 0.45, 0], height: 0.45, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 12, shape: { kind: "arc", radius: 0.5, arcDegrees: 120, rotation: [0, 0, 0] },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [5, 9], size: [0.14, 0.02],
                    color: 0xF2E3C2, alpha: [0.4, 0], light: "full", maxParticles: 44
                }
            ]
        },
        drive: {
            duration: 30,
            exit: { stop: 20, drain: 12 },
            emitters: [
                {
                    name: "launch", bind: "source", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: { data: "stride", fallback: 6 } },
                    shape: { kind: "ring", radius: 0.46, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.2],
                    gravity: 0.05, drag: 0.93,
                    lifetime: [8, 15], size: [0.11, 0.02], sizeMode: "index",
                    color: 0x9A7B45, alpha: [0.6, 0], light: "world", maxParticles: 110
                },
                {
                    name: "rush", bind: "source", offset: [0, 0.45, 0], height: 0.4, orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    rate: 30, trail: { minDistance: 0.3 }, shape: { kind: "box", size: [0.26, 0.34, 0.26] },
                    direction: "shape", speed: [0.05, 0.16],
                    lifetime: [3, 6], size: [0.2, 0.03],
                    color: 0xF6E7C4, alpha: [0.55, 0], light: "full", maxParticles: 140
                },
                {
                    name: "grit", bind: "source", offset: [0, 0.08, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 26, trail: { minDistance: 0.28 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.09],
                    lifetime: [7, 13], size: [0.08, 0.01],
                    color: 0xC2A163, alpha: [0.45, 0], light: "world", maxParticles: 130
                }
            ]
        },
        impact: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "blunt", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fighting",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.1, 0.3],
                    lifetime: [5, 10], size: [0.38, 0.06], sizeMode: "index",
                    color: 0xFFE0B0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 56
                },
                {
                    name: "shoe", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/foot",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "arc", radius: 0.44, arcDegrees: 160, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.06, 0.18],
                    lifetime: [8, 15], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xF0C884, alpha: [0.85, 0], light: "world", maxParticles: 44
                },
                {
                    name: "blast", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 24 },
                    shape: { kind: "sphere", radius: 0.46 },
                    direction: "outward", speed: [0.05, 0.22],
                    gravity: 0.04, drag: 0.92,
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xB99660, alpha: [0.55, 0], light: "world", maxParticles: 100
                }
            ]
        },
        launch: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "streak", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/quickattack_dashlines",
                    burst: { count: 10, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "away", speed: [0.12, 0.3],
                    lifetime: [6, 12], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xF6E7C4, alpha: [0.6, 0], light: "full", maxParticles: 70
                },
                {
                    name: "trail", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 22, trail: { minDistance: 0.35 }, shape: { kind: "point" },
                    direction: "outward", speed: [0.02, 0.1],
                    gravity: 0.05, drag: 0.94,
                    lifetime: [9, 16], size: [0.09, 0.01],
                    color: 0xB99660, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        whiff: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "air", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "stride", fallback: 16 } },
                    shape: { kind: "ring", radius: 0.42, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    gravity: 0.04, drag: 0.93,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xC2A163, alpha: [0.45, 0], light: "world", maxParticles: 80
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_megakick", 1, MegaKickDefinition);
