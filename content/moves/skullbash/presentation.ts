/**
 * 火箭头锤的粒子表现。
 *
 * 一句话：缩成一只壳、地环一圈圈压着蓄力，壳面架住打来的那一下会亮一下，然后出膛沿直线犁出去——
 *         那条贴地的碎石尾迹就是冲撞路线；把对手顶到墙上时，墙面炸开一大片碎岩。
 * 色相家族：铁灰外壳＋土黄尘埃（冷灰低饱和），碎岩是唯一略暖的小面积。
 * 拍子：起 tuck 0–18t／击 brace+launch+impact/slam 10–45t／收 skid 20–40t。
 * 范围：brace 的护罩贴着身体；launch 用 source 的尾迹画出真实冲撞线；slam 在目标处爆发，读得出“撞墙”。
 * 机制驱动：`data.intensity`（按实际伤害占目标最大生命的比例）乘上 impact/slam 各发射器的 rate 与
 * burst.count——撞得越实，碎岩越多越亮；`data.charge`（蓄力刻数）决定 brace moment 由服务端保持多久。
 * 持续状态：无。
 */
const SkullBashDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        tuck: {
            duration: 20,
            exit: { stop: 10, drain: 12 },
            emitters: [
                {
                    name: "tuck_shell", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/moves/withdraw",
                    burst: { count: 4, interval: 3, repeats: 2 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.5, 0.2], sizeMode: "index",
                    color: 0xD8DDE2, alpha: [0.85, 0], light: "full"
                },
                {
                    name: "tuck_ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    rate: 6, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0, 0.012],
                    lifetime: [12, 18], size: [0.5, 0.2], sizeMode: "sin",
                    color: 0xAEB6BE, alpha: [0.35, 0], light: "world", maxParticles: 22
                }
            ]
        },
        brace: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "brace_ring", bind: "source", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 3, interval: 10, repeats: 8, at: 1 }, shape: { kind: "ring", radius: 0.6 },
                    direction: "up", speed: [0, 0.012],
                    lifetime: [14, 22], size: [0.6, 0.3], sizeMode: "sin",
                    color: 0x9AA4AE, alpha: [0.3, 0.05], alphaMode: "sin", light: "world", maxParticles: 40
                },
                {
                    name: "brace_shell", bind: "source", offset: [0, 0.35, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/moves/withdraw",
                    rate: 28, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "inward", speed: [0.04, 0.12],
                    lifetime: [16, 26], size: [0.4, 0.16], sizeMode: "index",
                    color: 0xC8D0D8, alpha: [0.5, 0], light: "full", maxParticles: 80
                },
                {
                    name: "brace_dust", bind: "source", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 50, shape: { kind: "ring", radius: 0.55 },
                    direction: "outward", speed: [0.02, 0.08], gravity: 0.03, drag: 0.88,
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xB0A188, alpha: [0.5, 0], light: "world", maxParticles: 150
                },
                {
                    name: "brace_steam", bind: "source", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [16, 28], size: [0.16, 0.26],
                    color: 0x8A8F96, alpha: [0.22, 0], alphaMode: "sin", light: "world", maxParticles: 50
                }
            ]
        },
        parry: {
            duration: 18,
            emitters: [
                {
                    name: "parry_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_steel",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.3, thickness: 0.6 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [7, 13], size: [0.32, 0.04], sizeMode: "index",
                    color: 0xF0F4F8, alpha: [1, 0], light: "full", bloom: 0.25
                },
                {
                    name: "parry_sparks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 30 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xE8EEF4, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 60
                }
            ]
        },
        launch: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "launch_burst", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/dashburst",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "away", speed: [0.08, 0.22],
                    lifetime: [8, 14], size: [0.55, 0.18], sizeMode: "index",
                    color: 0xCDD4DA, alpha: [0.7, 0], light: "full", bloom: 0.15
                },
                {
                    name: "launch_lines", bind: "source", offset: [0, 0.4, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: 20, interval: 2, repeats: 4 }, shape: { kind: "point" },
                    direction: "away", speed: [0.03, 0.1],
                    lifetime: [6, 11], size: [0.6, 0.08], sizeMode: "index",
                    color: 0xE2E8EE, alpha: [0.5, 0], light: "world", maxParticles: 90
                },
                {
                    name: "launch_trail", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    trail: { minDistance: 0.25 }, rate: 80,
                    shape: { kind: "point" }, direction: "away", speed: [0.01, 0.05],
                    gravity: 0.03, drag: 0.9,
                    lifetime: [12, 22], size: [0.07, 0.02],
                    color: 0xA89A82, alpha: [0.45, 0], light: "world", maxParticles: 180
                },
                {
                    name: "launch_gravel", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    trail: { minDistance: 0.4 }, rate: 26,
                    shape: { kind: "point" }, direction: "up", speed: [0.04, 0.14],
                    gravity: 0.08, drag: 0.9,
                    lifetime: [10, 20], size: [0.1, 0.03],
                    color: 0x8A7A64, alpha: [0.5, 0], light: "world", maxParticles: 90
                }
            ]
        },
        impact: {
            duration: 28,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "impact_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 24 }, shape: { kind: "sphere", radius: 0.3, thickness: 0.55 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [7, 12], size: [0.36, 0.04], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.2
                },
                {
                    name: "impact_hit", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/hit",
                    burst: { count: 1 }, shape: { kind: "point" },
                    lifetime: [6, 10], size: [0.6, 0.32], sizeMode: "index",
                    color: 0xFFFFFF, alpha: [0.9, 0], light: "full"
                },
                {
                    name: "impact_debris", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.08, drag: 0.9,
                    lifetime: [14, 26], size: [0.24, 0.1],
                    color: 0x9A8A72, alpha: [0.85, 0], light: "world", maxParticles: 40
                },
                {
                    name: "impact_dust", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.01, drag: 0.9,
                    lifetime: [16, 28], size: [0.22, 0.34],
                    color: 0x7A6E5C, alpha: [0.4, 0], light: "world", maxParticles: 60
                }
            ]
        },
        slam: {
            duration: 34,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "slam_flash", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 40 }, shape: { kind: "sphere", radius: 0.34, thickness: 0.5 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [7, 14], size: [0.4, 0.05], sizeMode: "index",
                    color: 0xFFF2E0, alpha: [1, 0], light: "full", bloom: 0.3
                },
                {
                    name: "slam_rocks", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 30 }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.3], gravity: 0.1, drag: 0.88,
                    lifetime: [16, 30], size: [0.3, 0.12],
                    color: 0xA08E72, alpha: [0.9, 0], light: "world", maxParticles: 70
                },
                {
                    name: "slam_dust", bind: "target", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 36 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.18], gravity: 0.02, drag: 0.88,
                    lifetime: [18, 32], size: [0.24, 0.4],
                    color: 0x6E6352, alpha: [0.45, 0], light: "world", maxParticles: 90
                },
                {
                    name: "slam_ring", bind: "target", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/groundquake",
                    burst: { count: 3, interval: 3 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [12, 20], size: [0.5, 1.5],
                    color: 0xC8B490, alpha: [0.6, 0], light: "full"
                }
            ]
        },
        // The head breaks the wall behind the pinned foe: a short, heavy burst of stone at each block.
        crush: {
            duration: 20,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "crush_flash", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.08, 0.22],
                    lifetime: [6, 11], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xFFF2E0, alpha: [1, 0], light: "full", bloom: 0.2
                },
                {
                    name: "crush_rocks", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.08, 0.22], gravity: 0.1, drag: 0.88,
                    lifetime: [12, 24], size: [0.24, 0.1],
                    color: 0xA08E72, alpha: [0.85, 0], light: "world", maxParticles: 30
                },
                {
                    name: "crush_dust", bind: "point", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.12], gravity: 0.02, drag: 0.9,
                    lifetime: [14, 24], size: [0.18, 0.28],
                    color: 0x7A6E5C, alpha: [0.36, 0], light: "world", maxParticles: 30
                }
            ]
        },
        skid: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "skid_puff", bind: "point", offset: [0, 0.04, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 18 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.05, 0.16], gravity: 0.02, drag: 0.88,
                    lifetime: [14, 24], size: [0.18, 0.32],
                    color: 0x8A8070, alpha: [0.42, 0], light: "world", maxParticles: 50
                },
                {
                    name: "skid_gravel", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    burst: { count: 24 }, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.08, 0.24], gravity: 0.1, drag: 0.86,
                    lifetime: [10, 20], size: [0.12, 0.03],
                    color: 0x8A7A64, alpha: [0.7, 0], light: "world", maxParticles: 50
                }
            ]
        },
        // 空放撞墙：只在真正撞到的方块格上炸开一小片碎岩，读得出这一记头锤停在哪。
        crash: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "crash_flash", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.3, thickness: 0.5 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [6, 12], size: [0.34, 0.05], sizeMode: "index",
                    color: 0xFFF2E0, alpha: [1, 0], light: "full", bloom: 0.25
                },
                {
                    name: "crash_rocks", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.08, 0.24], gravity: 0.1, drag: 0.88,
                    lifetime: [12, 24], size: [0.26, 0.1],
                    color: 0xA08E72, alpha: [0.9, 0], light: "world", maxParticles: 40
                },
                {
                    name: "crash_dust", bind: "point", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.02, drag: 0.9,
                    lifetime: [14, 26], size: [0.2, 0.3],
                    color: 0x7A6E5C, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_skullbash", 1, SkullBashDefinition);
