/**
 * 信号光束 / signalbeam 的客户端表现。
 *
 * 一句话：施法者左右各亮起一枚信号源 → 两条细束（左红右蓝）从发射点射向瞄点、在交点汇出一点短白亮 →
 * 束线扫过的敌人身上炸开虫色冲击；被照乱的人头顶盘着飞鸟。
 * 色相家族：左束红（0xFF6B6B / 0xFFB3B3），右束蓝（0x6BB8FF / 0xC7E5FF），交点只用近白（0xFFFFFF）；
 *   虫色（0xD8C24A / 0xF2E9A8）留给命中与错乱果。
 * 拍子：起 gather（收信号）→ 左/右 beam_left/beam_right（两条细束真实裁剪）→ 交 cross（白亮点）
 *   → 墙 wall（撞墙溅点）→ 击 hit（虫色冲击）→ 果 jam（飞鸟）→ 续 linger（低密度余韵）。
 * 范围：beam_left/beam_right 的束线直接用 `data.path` 的两个顶点（发射点 → 真实终点），画出的就是判定真正扫到的那一段；
 *   交点白亮只在两束都到达焦点时服务端才发 cross。
 * 运动：gather 向内收；束线沿顶点铺开；hit 碎片向外炸；撞墙溅点贴面。
 * 数：`data.motes`（特攻与等级派生）驱动两条束的光点密度与命中碎片，`data.scale` 记录双束间距/威力。
 */
const SignalbeamDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "gather_left", bind: "source", offset: [-0.35, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0xFF6B6B, alpha: [0.9, 0], light: "full", maxParticles: 20
                },
                {
                    name: "gather_right", bind: "source", offset: [0.35, 0.35, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "inward", speed: [0.03, 0.09],
                    lifetime: [8, 15], size: [0.09, 0.02],
                    color: 0x6BB8FF, alpha: [0.9, 0], light: "full", maxParticles: 20
                }
            ]
        },
        beam_left: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "left_core", bind: "path", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "motes", fallback: 22 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0xFF6B6B, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "left_mote", bind: "path", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "motes", fallback: 14 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFB3B3, alpha: [0.8, 0], light: "full", maxParticles: 70
                }
            ]
        },
        beam_right: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "right_core", bind: "path", fit: "none", offset: [0, 0.02, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: { data: "motes", fallback: 22 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [6, 12], size: [0.1, 0.02],
                    color: 0x6BB8FF, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "right_mote", bind: "path", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "motes", fallback: 14 }, shape: { kind: "polyline" },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xC7E5FF, alpha: [0.8, 0], light: "full", maxParticles: 70
                }
            ]
        },
        cross: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "cross_flash", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.14, 0.02],
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 30
                }
            ]
        },
        wall: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "wall_spark", bind: "point", fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 8 } },
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [6, 12], size: [0.08, 0.01],
                    color: 0xF2E9A8, alpha: [0.75, 0], light: "full", maxParticles: 24
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
        miss: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "scatter", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/flying_bugs",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0x8FA83C, alpha: [0.55, 0], light: "world", maxParticles: 36
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
