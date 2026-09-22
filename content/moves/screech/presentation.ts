/**
 * 刺耳声 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把气提到喉咙、聚起一圈发白的声点 → 一声尖啸沿一条笔直而细的走廊推出去，声墙贴着地面铺满整条
 *   走廊、边缘卷着白亮的声纹 → 走廊里的敌人身上被扎出一记锐利的银蓝爆点，耳中留下嗡响。
 *
 * 色相家族：冷银蓝（0xB8C6D8／0x8FA2BC）为主体，近白（0xEEF4FA）只给细节与边缘；没有第二个色相。
 * 层次：喉间聚声（起手）→ 走廊声墙＋边缘白纹（击）→ 被扎中者的锐利爆点（每个目标）→ 头顶嗡响的细纹（持续）。
 * 起击收：windup（聚声）→ shriek（走廊成型、只播一次）→ stung（逐目标）→ linger（耳鸣还在，慢慢离场）。
 * 范围：shriek 的走廊顶点就是判定用的那条走廊（`data.path`），铺到哪就是会被扎到哪；长度 `data.reach`、
 *   半宽 `data.half` 与机制同源。
 * 运动：声墙沿走廊轴向 `data.direction` 推出，边缘的白纹沿顶点连线流动。
 * 数：走廊的密度绑 `data.rings`（物防下降级数派生），每人的爆点数量绑 `data.shocks`，掉级绑 `data.drop`。
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
        shriek: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "lane_air", bind: "path", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    shape: { kind: "polygon" },
                    rate: { data: "rings", fallback: 8 }, direction: "shape", speed: [0.1, 0.34], spread: 6, spin: 12,
                    lifetime: [6, 13], size: [0.2, 0.04],
                    color: 0x8FA2BC, alpha: [0.4, 0], light: "world", maxParticles: 300
                },
                {
                    name: "lane_edge", bind: "path", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    shape: { kind: "polyline", closed: true },
                    rate: 60, direction: "shape", speed: [0.1, 0.3], spread: 8,
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xEEF4FA, alpha: [0.85, 0], light: "full", maxParticles: 240
                },
                {
                    name: "lane_spine", bind: "source", offset: [0, 0.55, 0], height: 0.1, fit: "none", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/smallbeam",
                    burst: { count: 6, at: 0 },
                    shape: { kind: "line", length: { data: "reach", fallback: 6 } },
                    direction: "shape", speed: [0.0, 0.12],
                    lifetime: [8, 12], size: [0.13, 0.02], sizeMode: "index",
                    color: 0xDCE8F4, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 12
                },
                {
                    name: "lane_dust", bind: "path", height: 0.06,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    shape: { kind: "polygon" },
                    rate: { data: "rings", fallback: 8 }, direction: "outward", speed: [0.03, 0.12], drag: 0.94,
                    lifetime: [8, 16], size: [0.06, 0.02],
                    color: 0x7C8AA0, alpha: [0.4, 0], light: "world", maxParticles: 160
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
