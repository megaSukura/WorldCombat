/**
 * 突袭 / suckerpunch 的客户端表现。
 *
 * 一句话：施法者眼里闪过一丝暗光、盯住正在抬手的对手 → 身体一闪消失、只留一条黑影，下一瞬已经贴在目标
 * 身上刺出一记暗色冲击；读空时只是扑了个空、散开一缕黑烟。
 * 色相家族：暗紫（0x6B5AA8）与近黑（0x1E1630）、近白（0xE8E0FF）；亮色只给刺中那一下的核心。
 * 拍子：读 read（盯住目标，提交前）→ 闪 flash（身体消失）→ 击 strike（刺中）／空 whiff（读空）。
 * 范围：strike 的爆环半径用 `data.scale`（判定半径 / 0.38）给出，玩家看出这一刺能咬住多大一圈。
 * 运动：read 的暗光由外向内收、并有一点掠向目标；strike 的黑影由内向外炸、亮屑沿速度方向甩出。
 * 数：`data.count`（刺击威力派生）决定命中碎片与黑屑的数量，`data.power` 抬高亮度；数量与机制里的数一致。
 */
const SuckerpunchDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: { data: "windup", fallback: 1 },
            exit: { stop: 1, drain: 6 },
            emitters: [
                {
                    name: "focus", bind: "source", offset: [0, 0.7, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 8, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.03, 0.12],
                    lifetime: [4, 8], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0x8A78C8, alpha: [0.8, 0], light: "full", maxParticles: 14
                },
                {
                    name: "mark", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: 2 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [4, 7], size: [0.08, 0.02],
                    color: 0xC8B8FF, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 6
                }
            ]
        },
        flash: {
            duration: 8,
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "streak", bind: "source", offset: [0, 0.5, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "count", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.1, 0.3], spread: 18,
                    lifetime: [5, 9], size: [0.24, 0.05],
                    color: 0x2A1E44, alpha: [0.8, 0], light: "world", maxParticles: 40
                }
            ]
        },
        strike: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.08, 0.28],
                    lifetime: [6, 12], size: [0.36, 0.05], sizeMode: "index",
                    color: 0x6B5AA8, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 110
                },
                {
                    name: "spark", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "count", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.12, 0.34], spread: 24,
                    drag: 0.9,
                    lifetime: [9, 16], size: [0.09, 0.02],
                    color: 0xE8E0FF, alpha: [0.9, 0], light: "full", maxParticles: 120
                },
                {
                    name: "ring", bind: "target", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.7 } },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [9, 13], size: [0.36, 0.14],
                    color: 0x4A3A78, alpha: [0.55, 0], light: "world"
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "smoke", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.2, 0.05],
                    color: 0x3A3050, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "fade", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [7, 12], size: [0.1, 0.03],
                    color: 0x6B5AA8, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_suckerpunch", 1, SuckerpunchDefinition);
