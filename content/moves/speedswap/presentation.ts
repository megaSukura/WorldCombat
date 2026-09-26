/**
 * 速度互换 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：两个人脚边各亮起自己的速度刻线 → 交换的一瞬双方刻线交错、亮一圈 → 换来的速度维持期间，
 *   脚边只留一圈轻环与随实际速度变的刻线（快的人刻线更密），窗口走完各自静收。
 *
 * 色相家族：双色——被让出的快色暖橙 0xFFC24A 与收下的慢色青蓝 0x6FC7E8，中性近白 0xEAF2F8 只落在交换的强调环。
 *   两种速度必须同时被看见，所以这里用两个色相：暖色画「离开的那一份」，冷色画「收下的那一份」。
 * 层次：环（起手与维持，脚边各一圈）／刻线（主体，数量绑 data.marks，随实际速度变化）／尘（归位余韵）。
 * 拍子：read（起手 0–16t）→ cross（交换 0–26t）→ hold（维持，绑托管窗口，随窗口结束收回）→
 *   revert（归位 0–24t）／equal（速度相当，静）／fizzle（失败，烟散）。
 * 范围：全部贴着两人自己的脚边，不再拉一条跨距离的长线；刻线的数量与强弱来自服务端算出的实际速度。
 * 数：换手刻线数绑 data.marks（特攻派生）；维持期的刻线数同样绑 data.marks，而它由换后实际速度派生，
 *   所以换到快速度的一侧刻线更密、换到慢速度的一侧更疏。
 */
const SpeedSwapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        read: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "mine_read", bind: "source", fit: "body", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 12, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.09, 0.01], sizeMode: "sin",
                    color: 0x6FC7E8, alpha: [0.7, 0], light: "full", maxParticles: 28
                },
                {
                    name: "theirs_read", bind: "target", fit: "body", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 12, shape: { kind: "ring", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.09, 0.01], sizeMode: "sin",
                    color: 0xFFC24A, alpha: [0.7, 0], light: "full", maxParticles: 28
                }
            ]
        },
        cross: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "mine_burst", bind: "source", fit: "body", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "marks", fallback: 10 } }, shape: { kind: "ring", radius: 0.46 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [7, 13], size: [0.24, 0.02], sizeMode: "index",
                    color: 0x6FC7E8, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "theirs_burst", bind: "target", fit: "body", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "marks", fallback: 10 } }, shape: { kind: "ring", radius: 0.46 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [7, 13], size: [0.24, 0.02], sizeMode: "index",
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "spark", bind: "point", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: { data: "marks", fallback: 10 }, interval: 5, repeats: 2 },
                    shape: { kind: "sphere_surface", radius: 0.4 }, direction: "outward", speed: [0.08, 0.22],
                    lifetime: [8, 15], size: [0.09, 0.01], sizeMode: "index",
                    color: 0xEAF2F8, alpha: [0.9, 0], light: "full", maxParticles: 50
                }
            ]
        },
        hold: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "ring", bind: "source", fit: "body", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 2, shape: { kind: "ring", radius: 0.42 },
                    direction: "up", speed: [0.004, 0.016],
                    lifetime: [20, 34], size: [0.22, 0.02], sizeMode: "sin",
                    color: 0x6FC7E8, alpha: [0.22, 0], alphaMode: "sin", light: "world", maxParticles: 12
                },
                {
                    name: "marks", bind: "source", fit: "body", offset: [0, 0.07, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "marks", fallback: 6 }, interval: 24, repeats: 3 },
                    shape: { kind: "ring", radius: 0.4 }, direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.18, 0.02], sizeMode: "index",
                    color: 0xFFC24A, alpha: [0.32, 0], light: "world", maxParticles: 44
                }
            ]
        },
        revert: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "settle", bind: "source", fit: "body", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.2, 0.02], sizeMode: "index",
                    color: 0x9FB6C8, alpha: [0.4, 0], light: "world", maxParticles: 30
                },
                {
                    name: "dust", bind: "source", fit: "body", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "down", speed: [0.02, 0.08],
                    lifetime: [14, 24], size: [0.07, 0.02], gravity: 0.02, drag: 0.95,
                    color: 0x9FB6C8, alpha: [0.35, 0], light: "world", maxParticles: 24
                }
            ]
        },
        equal: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "mine_even", bind: "source", fit: "body", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 6 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.1, 0.01], sizeMode: "sin",
                    color: 0x9FB6C8, alpha: [0.4, 0], light: "world", maxParticles: 18
                },
                {
                    name: "theirs_even", bind: "target", fit: "body", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 6 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 16], size: [0.1, 0.01], sizeMode: "sin",
                    color: 0x9FB6C8, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "source", offset: [0, 0.55, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.2, 0.32],
                    color: 0x9FB6C8, alpha: [0.28, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_speedswap", 1, SpeedSwapDefinition);
