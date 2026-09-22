/**
 * 信号光束 / signalbeam 的客户端表现。
 *
 * 一句话：施法者额前点亮一排信号光 → 沿瞄准方向拉出一条琥珀色的宽光带、光带里飞满信号虫般的光点 →
 * 走廊里被照到的人身上炸开虫色冲击；被照乱的人头顶盘着飞鸟，再挨打就被黄电反冲一下。
 * 色相家族：信号琥珀（0xD8C24A 主 / 0x8FA83C 暗 / 0xF2E9A8 亮），近白只给冲击核心。
 * 拍子：起 gather（收信号）→ 照 beam（光带铺开）→ 击 hit（虫色冲击）→ 果 jam（飞鸟）
 *   → 反冲 jolt（黄电）→ 续 linger（低密度余韵）。
 * 范围：beam 的光带直接用 `data.path` 的四个顶点画填充多边形，画出的就是判定真正扫到的走廊。
 * 运动：gather 向内收；beam 里光点沿走廊流动；hit 的虫色碎片向外炸。
 * 数：`data.motes`（特攻与等级派生）决定光带光点与命中碎片密度，`data.gauge` 记录走廊真实半宽。
 */
const SignalbeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "gather_bug", bind: "source", offset: [0, 0.05, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 16, shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xF2E9A8, alpha: [0.9, 0], light: "full", maxParticles: 30
                },
                {
                    name: "gather_hum", bind: "source", offset: [0, 0.05, 0], height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 8, shape: { kind: "ring", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xD8C24A, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        beam: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "fill", bind: "path", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/ground_bugs",
                    rate: { data: "motes", fallback: 40 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 20], size: [0.1, 0.02],
                    color: 0x8FA83C, alpha: [0.35, 0], light: "world", maxParticles: 160
                },
                {
                    name: "edge", bind: "path", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "motes", fallback: 30 }, shape: { kind: "polyline", closed: true },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xD8C24A, alpha: [0.8, 0], light: "full", maxParticles: 120
                },
                {
                    name: "swarm", bind: "path", fit: "none", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    rate: { data: "motes", fallback: 16 }, shape: { kind: "polygon" },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [8, 16], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xF2E9A8, alpha: [0.7, 0], light: "full", maxParticles: 90
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", offset: [0, 0.1, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "motes", bind: "target", offset: [0, 0.1, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.16], spread: 30,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xF2E9A8, alpha: [0.85, 0], light: "full", maxParticles: 60
                }
            ]
        },
        jam: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "birds", bind: "target", offset: [0, 0.3, 0], height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    burst: { count: 4, interval: 3, repeats: 3 }, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 24], size: [0.22, 0.1], sizeMode: "sin",
                    color: 0xD8C24A, alpha: [0.6, 0], light: "full", maxParticles: 20
                },
                {
                    name: "static", bind: "target", offset: [0, 0.15, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 1, interval: 4, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.14],
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xF2E9A8, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        jolt: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "spark", bind: "target", offset: [0, 0.05, 0], height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: 2 },
                    shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [6, 12], size: [0.2, 0.04], sizeMode: "index",
                    color: 0xF2E9A8, alpha: [0.95, 0], light: "full", bloom: 0.25, maxParticles: 5
                }
            ]
        },
        miss: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8FA83C, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        linger: {
            exit: { drain: 34 },
            emitters: [
                {
                    name: "linger_bird", bind: "target", offset: [0, 0.3, 0], height: 1.06,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 3, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 28], size: [0.18, 0.07], sizeMode: "sin",
                    color: 0xD8C24A, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 12
                },
                {
                    name: "linger_spark", bind: "target", offset: [0, 0.12, 0], height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 4, shape: { kind: "ring", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.07, 0.01],
                    color: 0xF2E9A8, alpha: [0.32, 0], light: "full", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_signalbeam", 1, SignalbeamDefinition);
