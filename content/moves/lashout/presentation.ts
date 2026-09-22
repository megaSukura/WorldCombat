/**
 * 泄愤 / lashout 的客户端表现。
 *
 * 一句话：施法者脚下腾起暗红怒气、身上每条负等级缠成一缕黑气 → 欺身撞上目标时若还带着负等级就喷出暗红爆 →
 * 把怒气泄掉、化作一阵向上的红光包住自己。
 * 色相家族：暗红与近黑（impact_dark、anger_red、obscuringsmoke），强调处用一点橙红。
 * 拍子：蓄 fume → 喷 strike / vent → 泄 rage。
 * 范围：fume/rage 画在施法者身上；strike/vent 的点爆与环由 `data.scale`（判定半径派生）决定大小。
 * 运动：fume 的黑气由外向内缠、暗红怒气向上冒；vent 由内向外炸；rage 的红光贴着身体向上升。
 * 数：`data.fumes`（受挫等级派生）决定蓄怒粒子数量，`data.count`（最终威力派生）决定命中碎片数量，
 *   `data.boosted` 决定怒气红光的强度；画面里的数量与机制里的数一致。
 */
const LashoutDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        fume: {
            duration: { data: "windup", fallback: 8 },
            exit: { stop: 5, drain: 14 },
            emitters: [
                {
                    name: "wrath", bind: "source", offset: [0, 0, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    rate: { data: "fumes", fallback: 20 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [10, 18], size: [0.14, 0.04],
                    color: 0xB23A4A, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "bind", bind: "source", offset: [0, 0, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [9, 16], size: [0.16, 0.04],
                    color: 0x3A1F26, alpha: [0.4, 0], light: "world", maxParticles: 46
                }
            ]
        },
        strike: {
            duration: 24,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 20 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.07, 0.26],
                    lifetime: [7, 13], size: [0.36, 0.05], sizeMode: "index",
                    color: 0x9B4A5A, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.9 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [10, 14], size: [0.4, 0.16],
                    color: 0x6A2A34, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        vent: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 34 } },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "shape", speed: [0.12, 0.34],
                    lifetime: [8, 14], size: [0.46, 0.05], sizeMode: "index",
                    color: 0xE2543A, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 120
                },
                {
                    name: "shards", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: { data: "count", fallback: 30 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.16, 0.44], spread: 24,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xFF7A4A, alpha: [0.95, 0], light: "full", maxParticles: 130
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.1 } },
                    direction: "inward", speed: [0.06, 0.12],
                    lifetime: [10, 16], size: [0.52, 0.2],
                    color: 0xB23A2A, alpha: [0.7, 0], light: "full"
                }
            ]
        },
        rage: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "updraft", bind: "source", offset: [0, 0, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/mood/anger_red",
                    burst: { count: { data: "count", fallback: 18 } },
                    shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.08, 0.3],
                    lifetime: [8, 16], size: [0.16, 0.03],
                    color: 0xFF7A4A, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lashout", 1, LashoutDefinition);
