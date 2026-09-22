/**
 * 输电 / Electrify 的客户端表现。
 *
 * 一句话：施法者指尖一亮，几条电弧沿着两点之间的直线爬过去打在目标身上 → 目标全身缠上一层噼啪的电壳 →
 *         它一出招，这层电壳就沿着那一击炸开、剥落。
 * 色相家族：electric yellow 0xFFD84A 作主体；暖白 0xFFF3C4 作高光；只在电壳强调层留一点青白 0xAFF2FF。
 * 起击收：起 windup 10t ／击 arc 26t ／击 charge 32t ／持 linger 续期 ／击 discharge 26t ／收 fade 20t。
 * 持续状态：linger 低密度裹在身体外沿，透过去看得清目标。
 * 机制驱动：电弧条数 arcCount、爆开规模 burst 来自本招算出的参数；电弧沿 data.path 的同一组顶点（施放者与目标）
 *           画在两点之间，画面与机制指向同一段距离。
 *
 * 层 | 职责 | 贴图 | 运动 | 尺寸 | 寿命 | alpha | 存活
 * windup 强调 electricity_yellow 球面内聚          0.18-0.05 8-16  0.9→0  ≤30
 * arc  主体 bolt              沿 path 折线、随机抖动 0.18-0.05 10-18 0.9→0  ≤40
 * arc  细节 accessory_spark   沿 path 外散          0.06-0.02 8-14  0.8→0  ≤40
 * charge 强调 electricity_white 球面外散           0.2-0.05  10-20 1→0    ≤40
 * charge 细节 glowingsparkle_yellow 环外散         0.08-0.02 8-16  0.9→0  ≤50
 * linger 主体 electricity_white 球面贴附、慢上浮    0.1-0.03  20-34 0.4→0  ≤40
 * linger 细节 accessory_spark   环上浮             0.05-0.01 16-28 0.5→0  ≤40
 * discharge 强调 electricity_yellow 球面外爆＋drag  0.26-0.06 12-24 1→0    ≤70
 * discharge 细节 smallsparkle   球面外散            0.06-0.01 8-16  0.9→0  ≤70
 * fade 细节 smallsparkle        球面外散            0.05-0.01 8-14  0.5→0  ≤24
 */
const ElectrifySceneDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 10,
            exit: { stop: 5, drain: 10 },
            emitters: [
                { name: "coil", bind: "source", offset: [0, 0.55, 0.35], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: 14, interval: 2, repeats: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [8, 16], size: [0.18, 0.05],
                    color: 0xFFD84A, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 30 }
            ]
        },
        arc: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                { name: "bolt", bind: "path", particle: "world_combat_core:cobblemon/generic/electricity/bolt",
                    burst: { count: { data: "arcCount", fallback: 8 } }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.02, 0.08], spread: [4, 14],
                    lifetime: [10, 18], size: [0.18, 0.05],
                    color: 0xFFD84A, alpha: [0.9, 0], light: "full", maxParticles: 40 },
                { name: "arc_detail", bind: "path", particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    burst: { count: { data: "arcCount", fallback: 8 } }, shape: { kind: "polyline" },
                    direction: "shape", speed: [0.03, 0.12], spread: [10, 30],
                    lifetime: [8, 14], size: [0.06, 0.02],
                    color: 0xFFF3C4, alpha: [0.8, 0], light: "full", maxParticles: 40 }
            ]
        },
        charge: {
            duration: 32,
            exit: { stop: 12, drain: 20 },
            emitters: [
                { name: "shell", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 20 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.05, 0.16], drag: 0.9,
                    lifetime: [10, 20], size: [0.2, 0.05],
                    color: 0xFFD84A, alpha: [1, 0], light: "full", maxParticles: 40 },
                { name: "shell_spark", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 16], size: [0.08, 0.02],
                    color: 0xFFF3C4, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 50 }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                { name: "skin", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "up", speed: [0.005, 0.02], spin: 18,
                    lifetime: [20, 34], size: [0.1, 0.03],
                    color: 0xFFD84A, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 40 },
                { name: "skin_spark", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/accessory_spark",
                    rate: 12, shape: { kind: "ring", radius: 0.36 },
                    direction: "up", speed: [0.004, 0.02],
                    lifetime: [16, 28], size: [0.05, 0.01],
                    color: 0xFFF3C4, alpha: [0.5, 0], alphaMode: "sin", light: "full", maxParticles: 40 }
            ]
        },
        discharge: {
            duration: 26,
            exit: { stop: 12, drain: 22 },
            emitters: [
                { name: "burst", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_yellow",
                    burst: { count: { data: "burst", fallback: 40 } }, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "outward", speed: [0.1, 0.28], drag: 0.88,
                    lifetime: [12, 24], size: [0.26, 0.06],
                    color: 0xFFD84A, alpha: [1, 0], light: "full", maxParticles: 70 },
                { name: "burst_detail", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "burst", fallback: 40 } }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 16], size: [0.06, 0.01],
                    color: 0xAFF2FF, alpha: [0.9, 0], light: "full", bloom: 0.35, maxParticles: 70 }
            ]
        },
        fade: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                { name: "shed", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0xFFF3C4, alpha: [0.5, 0], light: "world", maxParticles: 24 }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_electrify", 1, ElectrifySceneDefinition);
