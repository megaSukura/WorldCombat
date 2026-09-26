/**
 * 刺耳声 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把气提到喉咙、聚起一圈发白的声点 → 一声尖啸从嘴前推成一道薄薄的声前沿，沿走廊逐格向前扫 →
 *   被前沿扫到的敌人身上被扎出一记锐利的银蓝爆点，耳中留下嗡响。
 *
 * 色相家族：冷银蓝（0xB8C6D8／0x8FA2BC）为主体，近白（0xEEF4FA）只给细节与边缘；没有第二个色相。
 * 层次：喉间聚声（起手）→ 逐刻前推的薄声环与白亮边缘（击）→ 被扫中者的锐利爆点（每个目标）→ 头顶嗡响的细纹（持续）。
 * 起击收：windup（聚声）→ front（前沿逐刻推进、位置与服务端同步）→ stung（逐目标）→ linger（耳鸣还在，慢慢离场）。
 * 范围：front 的环半径绑 `data.half`（走廊半宽），每刻从服务端收到的最新位置就是前沿真正推进到的距离；
 *   声环所在平面垂直 `data.direction`，所以它始终是一堵横着推出去的薄墙。
 * 运动：环随前沿位置的每次更新向前跳一格；粒子寿命很短，尾迹迅速消散。
 * 数：环上密度绑 `data.rings`（物防下降级数派生），每人的爆点数量绑 `data.shocks`，掉级绑 `data.drop`。
 */
const ScreechDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "inhale", bind: "source", offset: [0, 0.35, 0], height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 18, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.12], spin: 10,
                    lifetime: [8, 15], size: [0.18, 0.04],
                    color: 0x8FA2BC, alpha: [0.5, 0], light: "world", maxParticles: 46
                },
                {
                    name: "throat", bind: "source", offset: [0, 0.4, 0], height: 0.86,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.09, 0.02],
                    color: 0xEEF4FA, alpha: [0.8, 0], light: "full", maxParticles: 24
                }
            ]
        },
        front: {
            duration: 22,
            exit: { stop: 5, drain: 8 },
            emitters: [
                {
                    name: "front_ring", bind: "point", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    shape: { kind: "ring", radius: { data: "half", fallback: 0.9 } },
                    orient: "direction", direction: "shape", speed: [0.06, 0.22], spread: 8,
                    rate: { data: "rings", fallback: 8 },
                    lifetime: [5, 9], size: [0.3, 0.6],
                    color: 0xEEF4FA, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "front_wall", bind: "point", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    shape: { kind: "circle", thickness: 0.55, radius: { data: "half", fallback: 0.9 } },
                    orient: "direction", direction: "shape", speed: [0.08, 0.28], spread: 6, spin: 14,
                    rate: { data: "rings", fallback: 8 },
                    lifetime: [5, 10], size: [0.2, 0.05],
                    color: 0x8FA2BC, alpha: [0.45, 0], light: "world", maxParticles: 180
                },
                {
                    name: "front_spine", bind: "point", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "circle", radius: { data: "half", fallback: 0.9 } },
                    orient: "direction", direction: "shape", speed: [0.06, 0.22], spread: 14,
                    rate: 24,
                    lifetime: [5, 9], size: [0.09, 0.02],
                    color: 0xDCE8F4, alpha: [0.8, 0], light: "full", maxParticles: 90
                },
                {
                    name: "front_dust", bind: "point", fit: "none", offset: [0, -0.4, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "ring", radius: { data: "half", fallback: 0.9 } },
                    orient: "direction", direction: "outward", speed: [0.02, 0.1], drag: 0.9,
                    rate: { data: "rings", fallback: 8 },
                    lifetime: [6, 11], size: [0.06, 0.02],
                    color: 0x7C8AA0, alpha: [0.4, 0], light: "world", maxParticles: 110
                }
            ]
        },
        stung: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stung_core", bind: "target", height: 0.62,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: { data: "shocks", fallback: 12 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.18], spread: 24,
                    lifetime: [8, 14], size: [0.3, 0.06], sizeMode: "index",
                    color: 0xB8C6D8, alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "stung_shiver", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "drop", fallback: 2 }, interval: 2, repeats: 4 },
                    shape: { kind: "circle", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [8, 16], size: [0.07, 0.01],
                    color: 0xEEF4FA, alpha: [0.7, 0], light: "full", maxParticles: 34
                }
            ]
        },
        linger: {
            exit: { drain: 28 },
            emitters: [
                {
                    name: "linger_rings", bind: "target", offset: [0, 0.4, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 3, shape: { kind: "ring", radius: 0.22 },
                    direction: "outward", speed: [0.0, 0.03],
                    lifetime: [14, 22], size: [0.16, 0.3],
                    color: 0x8FA2BC, alpha: [0.3, 0], alphaMode: "sin", light: "world", maxParticles: 10
                },
                {
                    name: "linger_motes", bind: "target", height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xEEF4FA, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_screech", 1, ScreechDefinition);
