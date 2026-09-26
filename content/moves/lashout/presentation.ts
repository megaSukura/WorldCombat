/**
 * 泄愤 / lashout 的客户端表现。
 *
 * 一句话：施法者脚下腾起暗红怒气，身上每条负等级缠成一缕黑气、从两侧收紧成短压痕 → 原地前踏留下双压痕步点 →
 * 朝正前方砸下时喷出暗红爆；确有负等级被解除，就在命中点碎出同等段数的束线 → 开启宣泄时再把怒气转成向上的红光包住自己。
 * 色相家族：暗红与近黑（impact_dark、anger_red、obscuringsmoke），强调处用一点橙红。
 * 拍子：蓄 fume → 踏 step → 砸 strike / vent → 碎 sever → 转 rage；空挥走 miss。
 * 范围：fume/rage 画在施法者身上；step 沿真实落点铺步点；strike/vent/sever 的点爆与环由 `data.scale`（判定半径派生）决定大小。
 * 运动：fume 的黑气从两侧向内收紧、暗红怒气向上冒；vent 由内向外炸；sever 的束线碎片向外崩散；rage 的红光贴着身体向上升。
 * 数：`data.fumes`（受挫等级派生）决定蓄怒粒子数量，`data.count`（最终威力派生）决定命中碎片数量，
 *   `data.removed`（实际解除的负等级数）决定碎出的束线段数，`data.boosted` 决定怒气红光强度；画面里的数量与机制里的数一致。
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
                    rate: 12, shape: { kind: "line", length: 0.5 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [9, 16], size: [0.16, 0.04],
                    color: 0x3A1F26, alpha: [0.4, 0], light: "world", maxParticles: 46
                },
                {
                    name: "leftmark", bind: "source", offset: [-0.3, 0.12, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.1], spread: 18,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0x5A2A32, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "rightmark", bind: "source", offset: [0.3, 0.12, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 8, shape: { kind: "sphere", radius: 0.24 },
                    direction: "inward", speed: [0.03, 0.1], spread: 18,
                    lifetime: [8, 14], size: [0.14, 0.03],
                    color: 0x5A2A32, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        step: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "tread", bind: "source", offset: [0, 0, 0], height: 0.03, trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/foot",
                    rate: 8,
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [8, 14], size: [0.15, 0.03],
                    color: 0x7A2A34, alpha: [0.55, 0], light: "world", maxParticles: 24
                },
                {
                    name: "dust", bind: "source", offset: [0, 0, 0], height: 0.05, trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 6, shape: { kind: "sphere", radius: 0.16 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [6, 12], size: [0.11, 0.02],
                    color: 0x3A1F26, alpha: [0.3, 0], light: "world", maxParticles: 20
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
                    name: "ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.9 } },
                    direction: "outward", speed: [0.05, 0.1],
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
                    name: "ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.1 } },
                    direction: "outward", speed: [0.06, 0.12],
                    lifetime: [10, 16], size: [0.52, 0.2],
                    color: 0xB23A2A, alpha: [0.7, 0], light: "full"
                }
            ]
        },
        sever: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "snap", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "removed", fallback: 1 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.3], spread: 30,
                    gravity: 0.02, drag: 0.88,
                    lifetime: [9, 16], size: [0.16, 0.03],
                    color: 0x3A1F26, alpha: [0.6, 0], light: "world", maxParticles: 20
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
        },
        miss: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "thud", bind: "point", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 14 },
                    shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.02, drag: 0.9,
                    lifetime: [7, 13], size: [0.16, 0.03],
                    color: 0x3A1F26, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lashout", 1, LashoutDefinition);
