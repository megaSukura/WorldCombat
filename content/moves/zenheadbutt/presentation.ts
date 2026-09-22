/**
 * 意念头锤 / zenheadbutt 的客户端表现。
 *
 * 一句话：前额聚起一团紫色念力，目标身上亮起一圈转动的锁定环，接着整个人拖着螺旋念力带扑出去、
 * 一路朝锁定的方向拐着弯追，撞实的一刻炸开紫色冲击；被撞懵的人头顶晃星。
 * 色相家族：念力紫（0xB48CE8）与近白（0xF0E6FF）；粉紫只在锁定环与尾迹上，饱和色只在冲击核心。
 * 拍子：起 windup（前额聚念）→ 锁 lock（目标环）→ 击 drive（螺旋冲刺）→ impact（命中峰值）／ miss（念力溃散）→ stagger（撞懵）。
 * 范围：lock 的锁定环按机制画在目标身上（大小随体型），drive 的螺旋沿施法者实际拐出的轨迹铺开。
 * 运动：drive 的念力带绕冲刺轴螺旋前进，方向由服务端下发的冲刺朝向决定；落空时念力在原地溃散成一团雾。
 * 数：`data.hits`（威力派生）决定命中碎屑数，`data.intensity`（威力 / 80）抬高密度与亮度，
 * `data.scale`（头面判定 / 0.48）放大头部与冲击，`data.turn`（每刻转向度数）决定螺旋的紧密程度，
 * `data.lock`（锁定印记刻数）决定锁定环的存活。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const ZenheadbuttDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 9, drain: 12 },
            emitters: [
                {
                    name: "focus", bind: "source", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: 18, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xB48CE8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "will", bind: "source", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 10, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.01, 0.05], spin: 8,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0xF0E6FF, alpha: [0.6, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        lock: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "ring", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    rate: 8, shape: { kind: "torus", radius: 0.5, thickness: 0.16 },
                    direction: "inward", speed: [0.01, 0.05], spin: 6,
                    lifetime: [10, 18], size: [0.3, 0.6], sizeMode: "sin",
                    color: 0xB48CE8, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 50
                },
                {
                    name: "mark", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 6, interval: 5, repeats: 2 },
                    shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xF0E6FF, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        drive: {
            duration: 50,
            exit: { stop: 36, drain: 14 },
            emitters: [
                {
                    name: "spiral", bind: "source", offset: [0, 0.5, 0], height: 0.35, orient: "velocity",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 34, trail: { minDistance: 0.28 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1], spin: { data: "turn", fallback: 12 },
                    lifetime: [7, 13], size: [0.2, 0.04],
                    color: 0xB48CE8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 190
                },
                {
                    name: "headspeed", bind: "source", offset: [0, 0.55, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    rate: 24, shape: { kind: "box", size: [0.26, 0.3, 0.26] },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [3, 7], size: [0.15, 0.04],
                    color: 0xEAD9FF, alpha: [0.45, 0], light: "full", maxParticles: 120
                },
                {
                    name: "wake", bind: "source", offset: [0, 0.25, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    rate: 10, shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [6, 11], size: [0.1, 0.03],
                    color: 0xD8BEFF, alpha: [0.4, 0], light: "full", maxParticles: 70
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_psychic",
                    burst: { count: { data: "hits", fallback: 16 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "shape", speed: [0.07, 0.26],
                    lifetime: [6, 11], size: [0.36, 0.05], sizeMode: "index",
                    color: 0xF0E6FF, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 66
                },
                {
                    name: "shards", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/moves/psychichit_small",
                    burst: { count: { data: "hits", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.24], spin: 8,
                    lifetime: [9, 16], size: [0.2, 0.04],
                    color: 0xB48CE8, alpha: [0.85, 0], light: "full", maxParticles: 120
                },
                {
                    name: "shock", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 17], size: [0.4, 0.9], sizeMode: "sin",
                    color: 0xD8BEFF, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        stagger: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "daze", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 5, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.06], spread: 10,
                    lifetime: [12, 18], size: [0.14, 0.04],
                    color: 0xF0E6FF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 22
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 9, drain: 15 },
            emitters: [
                {
                    name: "fizzle", bind: "source", offset: [0, 0.4, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    burst: { count: 18 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.14],
                    drag: 0.9,
                    lifetime: [9, 16], size: [0.16, 0.06],
                    color: 0xB48CE8, alpha: [0.55, 0], light: "full", maxParticles: 48
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_zenheadbutt", 1, ZenheadbuttDefinition);
