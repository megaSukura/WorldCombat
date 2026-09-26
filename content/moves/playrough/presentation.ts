/**
 * 嬉闹 / playrough 的客户端表现。
 *
 * 一句话：施法者压身起滚、身后扬起一串粉色光尘 → 撞上目标的一刻炸开彩色纸屑与冲击帧 → 被撞翻的人身上
 * 冒一颗下坠的心、攻击被压时再亮一圈粉星。
 * 色相家族：妖精粉（0xF0A8C8 主 / 0xFFE4F2 亮 / 0xC86AA0 暗）为主体，彩色纸屑保留原色只做点缀。
 * 拍子：起 windup（压身）→ 滚 run（带尾）→ 转 roll（撒欢式真实的掉头，带转向朝向）→ 击 impact（撞翻）
 *   → 翻 ricochet（第二个）→ 压 disarm（降攻）。
 * 范围：impact/ricochet 的贴地环与纸屑按 `data.scale`（判定半径 / 0.48）铺开，就是这一撞扫过的范围。
 * 运动：run 绑 source 沿滚向拖尾；roll 绑 point 在掉头处按 `data.direction` 甩出一圈转向尘；
 *   impact 的纸屑初速外抛、带重力坠落；disarm 的星向上冒。
 * 数：`data.sparkles`（物攻与等级派生）决定滚动尾迹与撞翻纸屑的密度，`data.intensity` 抬高亮度。
 */
const PlayRoughDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "kick_dust", bind: "source", offset: [0, 0.02, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 16, shape: { kind: "ring", radius: 0.35 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xD8B8A0, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "ready", bind: "source", offset: [0, 0.05, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xFFE4F2, alpha: [0.85, 0], light: "full", maxParticles: 24
                }
            ]
        },
        run: {
            duration: 44,
            exit: { stop: 20, drain: 16 },
            emitters: [
                {
                    name: "roll_trail", bind: "source", offset: [0, 0.05, 0], height: 0.15,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.24 }, rate: { data: "sparkles", fallback: 14 },
                    direction: "up", speed: [0.02, 0.09], spread: 24,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xD8B8A0, alpha: [0.55, 0], light: "world", maxParticles: 90
                },
                {
                    name: "roll_spark", bind: "source", offset: [0, 0.25, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    trail: { minDistance: 0.4 }, rate: 16, spin: 10,
                    shape: { kind: "sphere", radius: 0.18 },
                    direction: "away", speed: [0.02, 0.1], spread: 30,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xF0A8C8, alpha: [0.75, 0], light: "full", maxParticles: 70
                }
            ]
        },
        roll: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "pivot_dust", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "sparkles", fallback: 12 } },
                    shape: { kind: "ring", radius: 0.28 },
                    direction: "outward", speed: [0.06, 0.18], spread: 26,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xD8B8A0, alpha: [0.6, 0], light: "world", maxParticles: 24
                },
                {
                    name: "turn_glint", bind: "point", fit: "none", offset: [0, 0.28, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 10 }, spin: 12,
                    shape: { kind: "circle", radius: 0.22 },
                    direction: "away", speed: [0.05, 0.16], spread: 30,
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xF0A8C8, alpha: [0.85, 0], light: "full", maxParticles: 18
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "hit", bind: "target", offset: [0, 0.12, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 3, interval: 2 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.0, 0.05],
                    lifetime: 9, size: [0.32, 0.05], sizeMode: "index",
                    color: 0xFFE4F2, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 10
                },
                {
                    name: "confetti", bind: "target", offset: [0, 0.35, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "sparkles", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.24], spread: 40,
                    gravity: 0.035, drag: 0.94, spin: 14,
                    lifetime: [16, 26], size: [0.12, 0.03],
                    color: 0xF0A8C8, alpha: [0.95, 0], light: "world", maxParticles: 90
                },
                {
                    name: "scuff", bind: "target", offset: [0, 0.03, 0], height: 0.05, orient: "fixed",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 },
                    shape: { kind: "ring", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [10, 16], size: [0.26, 0.6],
                    color: 0xC86AA0, alpha: [0.6, 0], light: "world", maxParticles: 5
                }
            ]
        },
        ricochet: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "bounce", bind: "target", offset: [0, 0.12, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fairy",
                    burst: { count: 2, interval: 2 },
                    shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.0, 0.04],
                    lifetime: 8, size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFE4F2, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 6
                },
                {
                    name: "paper", bind: "target", offset: [0, 0.3, 0], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "sparkles", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.05, 0.2], spread: 36,
                    gravity: 0.035, drag: 0.94, spin: 12,
                    lifetime: [14, 22], size: [0.1, 0.02],
                    color: 0xF0A8C8, alpha: [0.9, 0], light: "world", maxParticles: 60
                }
            ]
        },
        disarm: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "heart", bind: "target", offset: [0, 0.35, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 3, interval: 4, repeats: 2 },
                    shape: { kind: "circle", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04], spin: 10,
                    lifetime: [14, 22], size: [0.16, 0.04],
                    color: 0xF0A8C8, alpha: [0.8, 0], light: "full", maxParticles: 14
                },
                {
                    name: "dim", bind: "target", offset: [0, 0.15, 0], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 6 },
                    shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.16, 0.03],
                    color: 0xA87890, alpha: [0.28, 0], light: "world", maxParticles: 16
                }
            ]
        },
        miss: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "puff", bind: "point", fit: "none", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [10, 16], size: [0.08, 0.01],
                    color: 0xD8B8A0, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_playrough", 1, PlayRoughDefinition);
