/**
 * 万圣夜 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者抖开一件南瓜色的斗篷盖到对手身上，壳上炸开一圈橙黄火花与糖果彩片；
 *   外壳期间它身上一直飘着南瓜灯的火星与幽灵蓝雾，直到壳被剥落。
 *
 * 色相家族：南瓜橙（0xE88A3C）做外壳主体，糖果黄（0xF7D02C）做火花与彩片，幽灵紫（0x735797）做壳里的烟雾。
 * 层次：招呼（起手，斗篷在施法者身上展开）→ 披壳（外壳裹上＋橙色火花＋糖果彩片）→ 持壳（低密度火星与蓝雾）
 *   → 剥落／被挡／落空。
 * 起击收：windup（招呼）→ dress（披壳）→ hold（持壳，慢慢离场）→ tear（剥落）。
 * 范围：单体套壳，外壳与火花画的正是被套住的那个人；套壳距离由 reach 决定，画面沿视线铺开。
 * 运动：外壳从施法者沿视线罩向目标（bind path polyline），火花向外炸开；持壳时火星贴着它上浮。
 * 数：装饰火花与彩片的数量读 data.motes（体重派生），外壳时长读 data.shell（决定外壳尺度与幽灵雾的浓度）。
 */
const TrickortreatDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "unfold_cloak", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE88A3C, alpha: [0.5, 0], light: "full", maxParticles: 28
                }
            ]
        },
        dress: {
            duration: 34,
            exit: { stop: 18, drain: 22 },
            emitters: [
                {
                    name: "shell_cloak", bind: "path", offset: [0, 0.9, 0],
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 14 }, direction: "shape", speed: [0.04, 0.13], spread: 20,
                    lifetime: [12, 20], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xE88A3C, alpha: [0.8, 0], light: "full", maxParticles: 72
                },
                {
                    name: "candy_burst", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/confetti",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.05, 0.18], spread: 30, gravity: 0.01,
                    lifetime: [14, 24], size: [0.18, 0.04], sizeMode: "index",
                    color: 0xF7D02C, alpha: [0.95, 0], light: "full", maxParticles: 60
                },
                {
                    name: "shell_impact", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: 4, interval: 3 }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.2, 0.06],
                    color: 0x735797, alpha: [0.7, 0], light: "full", maxParticles: 24
                }
            ]
        },
        hold: {
            exit: { drain: 26 },
            emitters: [
                {
                    name: "shell_ember", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: { data: "motes", fallback: 6 }, shape: { kind: "sphere", radius: 0.36 },
                    direction: "up", speed: [0.01, 0.05], gravity: -0.002,
                    lifetime: [12, 20], size: [0.08, 0.02], alphaMode: "sin",
                    color: 0xE88A3C, alpha: [0.4, 0], light: "full", maxParticles: 26
                },
                {
                    name: "shell_haze", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 4, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.24, 0.06],
                    color: 0x735797, alpha: [0.22, 0], light: "world", maxParticles: 20
                }
            ]
        },
        tear: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "tear_fall", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "away", speed: [0.03, 0.1], gravity: 0.012,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xE88A3C, alpha: [0.7, 0], light: "world", maxParticles: 28
                },
                {
                    name: "tear_dust", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.09], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC6B8A8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blocked_dust", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 9, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC6B8A8, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        fizzle: {
            duration: 18,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC6B8A8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_trickortreat", 1, TrickortreatDefinition);
