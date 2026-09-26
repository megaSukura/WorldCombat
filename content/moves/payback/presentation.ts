/**
 * 以牙还牙 / payback 的客户端表现。
 *
 * 一句话：施法者低身收势、把受过伤的暗色能量从伤势里聚到身体一侧（伤得越重收得越多）→ 短促沉重地迎上前，
 * 脚边沿真实落点留下脚印与尘 → 撞上目标的一刻，若目标先动过手就炸开更暗更密的一记并浮出「以牙还牙！」，
 * 无论中与不中，脚下都顿出一圈收势尘。
 * 色相家族：暗紫到近黑（impact_dark、obscuringsmoke、glowingsparkle），翻倍时混入一点血红强调。
 * 拍子：起 gather（收势）→ 迎 gait（脚痕）→ 击 strike / counter（翻倍）→ 收 settle。
 * 范围：gather 画在施法者偏一侧；strike/counter 的点爆与环由 `data.scale`（判定半径派生）决定大小，
 *   玩家一眼看出这一记能咬住多大的圈。
 * 运动：gather 的能量由外向内收且偏一侧；gait 沿真实位移留脚印；命中碎片由内向外炸；settle 由脚边向外压开。
 * 数：`data.gather`（缺失生命比例派生）决定收势粒子数量，`data.count`（最终威力/迎步距离派生）决定命中碎片与收势尘数量，
 *   `data.power`（最终威力）与 `data.scale` 抬高亮度与尺寸；画面里的数量与机制里的数一致。
 */
const PaybackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: { data: "windup", fallback: 6 },
            exit: { stop: 4, drain: 12 },
            emitters: [
                {
                    name: "intake", bind: "source", offset: [0.28, 0.05, 0], height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/scalingshaded",
                    rate: { data: "gather", fallback: 22 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "inward", speed: [0.03, 0.14], spread: 20,
                    lifetime: [7, 13], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0x8A6AD0, alpha: [0.8, 0], light: "full", maxParticles: 80
                },
                {
                    name: "wound", bind: "source", offset: [0.22, 0.3, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 10, shape: { kind: "hemisphere", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [10, 18], size: [0.18, 0.05],
                    color: 0x3A2C4A, alpha: [0.35, 0], light: "world", maxParticles: 40
                }
            ]
        },
        gait: {
            duration: 12,
            exit: { stop: 4, drain: 8 },
            emitters: [
                {
                    name: "foot", bind: "source", offset: [0, 0, 0], height: 0.03, trail: { minDistance: 0.34 },
                    particle: "world_combat_core:cobblemon/generic/foot",
                    rate: { data: "gait", fallback: 8 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [8, 14], size: [0.16, 0.03],
                    color: 0x6A5A8A, alpha: [0.55, 0], light: "world", maxParticles: 30
                },
                {
                    name: "dust", bind: "source", offset: [0, 0, 0], height: 0.06, trail: { minDistance: 0.34 },
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "gait", fallback: 6 }, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [6, 12], size: [0.12, 0.02],
                    color: 0x3A2C4A, alpha: [0.3, 0], light: "world", maxParticles: 26
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
                    burst: { count: { data: "count", fallback: 18 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [7, 13], size: [0.34, 0.05], sizeMode: "index",
                    color: 0x9B7AD0, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 90
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.8 } },
                    direction: "inward", speed: [0.05, 0.1],
                    lifetime: [10, 14], size: [0.4, 0.16],
                    color: 0x6A4AB0, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        counter: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "count", fallback: 30 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "shape", speed: [0.1, 0.32],
                    lifetime: [8, 14], size: [0.42, 0.05], sizeMode: "index",
                    color: 0xE24B8A, alpha: [1, 0], light: "full", bloom: 0.5, maxParticles: 110
                },
                {
                    name: "mark", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "count", fallback: 26 } },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.14, 0.4], spread: 22,
                    gravity: 0.03, drag: 0.9,
                    lifetime: [10, 18], size: [0.09, 0.02],
                    color: 0xFF9EC8, alpha: [0.95, 0], light: "full", maxParticles: 120
                },
                {
                    name: "ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 1.0 } },
                    direction: "inward", speed: [0.06, 0.12],
                    lifetime: [10, 16], size: [0.5, 0.2],
                    color: 0xB23A6A, alpha: [0.7, 0], light: "full"
                }
            ]
        },
        settle: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "press", bind: "source", offset: [0, 0, 0], height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "count", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.36 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.02, drag: 0.9,
                    lifetime: [7, 13], size: [0.16, 0.03],
                    color: 0x3A2C4A, alpha: [0.4, 0], light: "world", maxParticles: 30
                },
                {
                    name: "ring", bind: "source", offset: [0, 0, 0], height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: { data: "scale", fallback: 0.6 } },
                    direction: "outward", speed: [0.08, 0.2],
                    lifetime: [9, 14], size: [0.2, 0.5],
                    color: 0x8A6AD0, alpha: [0.6, 0], light: "full", maxParticles: 4
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_payback", 1, PaybackDefinition);
