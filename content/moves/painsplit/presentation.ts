/**
 * 分担痛楚 / painsplit 的客户端表现。
 *
 * 一句话：一条细红的痛线在两者之间牵起，两团生命光汇到线上、拉直后从中间分开，低的一方被填上、高的被抽走，
 * 两端各落一圈落定光。
 * 色相家族：痛楚红橙（energyorb / mediumring）为主，近白高光（smallfadeorb）落在两端脉动上；两端同一色相，不分敌我。
 * 拍子：牵（reach 细线与两端心跳）→ 分（share 线上流动与两端脉冲）→ 落（share 尾段收敛）／空（miss 尘土）。
 * 范围：reach 与 share 都沿 data.path 的施法者—目标顶点铺开，画面就是这条痛线落到的两点之间。
 * 运动：生命光从两端向中间汇、在中央合并后沿原线向两边分开；两端的心跳一涨一落，表示各自被填上或被抽走。
 * 数：`data.flow`（本次真实生命差与体型、等级派生的流动粒子数）驱动线上发射与中央爆发，差得越多画得越密；
 * `data.average`（这次拉平到的生命值）与 `data.selfUp`／`data.targetUp`（谁被填上、谁被抽走）随载荷提供。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const PainsplitDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        reach: {
            duration: 22,
            exit: { stop: 12, drain: 14 },
            emitters: [
                {
                    name: "line", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    shape: { kind: "polyline", closed: false },
                    rate: { data: "motes", fallback: 12 },
                    direction: "shape", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.08, 0.015],
                    color: 0xFF8A72, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "beatSelf", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0xFF6B5A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "beatFoe", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    rate: { data: "motes", fallback: 12 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 15], size: [0.2, 0.04], sizeMode: "sin",
                    color: 0xFF6B5A, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        share: {
            duration: 34,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "flow", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    shape: { kind: "polyline", closed: false },
                    rate: { data: "flow", fallback: 12 },
                    direction: "shape", speed: [0.02, 0.09],
                    lifetime: [5, 11], size: [0.1, 0.02],
                    color: 0xFFB199, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 120
                },
                {
                    name: "merge", bind: "path", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/energyorb",
                    burst: { count: { data: "flow", fallback: 12 }, at: 1 },
                    shape: { kind: "polyline", closed: false },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [7, 14], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFD9D0, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "settleSelf", bind: "source", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.55, arcDegrees: 360 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [10, 16], size: [0.3, 0.06],
                    color: 0xFFC9BC, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "settleFoe", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.55, arcDegrees: 360 },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [10, 16], size: [0.3, 0.06],
                    color: 0xFFC9BC, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 6
                }
            ]
        },
        miss: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "dud", bind: "source", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.05, 0.01],
                    color: 0x8C5A52, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_painsplit", 1, PainsplitDefinition);
