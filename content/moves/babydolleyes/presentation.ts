/**
 * 圆瞳 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者睁圆一双眼睛（两圈粉色瞳环在脸侧张开），一道眼波沿视线落到对手身上，把它身上炸开一层
 *   软化的粉雾，之后头顶持续浮着一点没脾气的眼波。
 *
 * 色相家族：妖精粉（0xF7A8C4／0xE87BA8）为主体，近白粉（0xFFE0EC）只做瞳环高光与眼波小点，
 *   灰白（0xCCC6CC）只在被挡住那一刻出现。没有第二个色相。
 * 层次：睁眼（起手，两圈瞳环＋眼波向眼内收）→ 看软（一道眼波线＋目标粉雾＋粉环）→ 真降攻（垂下小攻势符号）
 *   → 余韵（头顶眼波）→ 被挡／落空。
 * 起击收：windup（睁眼）→ gaze（落到人身上）→ drop（只有真正掉了等级才垂下攻势符号）→ linger（心软还在，慢慢离场）。
 * 范围：单体凝视，眼波线与目标粉环画的正是被看软的那个人；凝视距离由 gazeRange 决定。
 * 运动：一道眼波沿两点连线在整条边上铺开（bind path polyline，direction shape 由形状向外），不是沿线飞行的投射物；
 *   目标粉雾向外散、再缓慢上浮。
 * 数：眼波线与粉雾的数量读 data.glints（特攻派生），凝视（data.stare）时整体更厚；drop 读本次真实降下的等级数。
 */
const BabydolleyesDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "pupil_left", bind: "source", offset: [-0.18, 1.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 6, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.16, 0.04],
                    color: 0xFFE0EC, alpha: [0.8, 0], light: "full", bloom: 0.15, maxParticles: 12
                },
                {
                    name: "pupil_right", bind: "source", offset: [0.18, 1.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 6, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.16 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.16, 0.04],
                    color: 0xFFE0EC, alpha: [0.8, 0], light: "full", bloom: 0.15, maxParticles: 12
                },
                {
                    name: "blink_motes", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 8, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xF7A8C4, alpha: [0.7, 0], light: "full", maxParticles: 20
                }
            ]
        },
        gaze: {
            duration: 28,
            exit: { stop: 15, drain: 18 },
            emitters: [
                {
                    name: "gaze_line", bind: "path", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    shape: { kind: "polyline" },
                    rate: { data: "glints", fallback: 14 }, direction: "shape", speed: [0.05, 0.15], spread: 16,
                    lifetime: [8, 15], size: [0.11, 0.03], sizeMode: "sin",
                    color: 0xF7A8C4, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "gaze_puff", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "glints", fallback: 14 } }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.03, 0.12], spread: 22, drag: 0.9,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xFFE0EC, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "gaze_ring", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "outward", speed: [0.05, 0.13],
                    lifetime: [12, 18], size: [0.32, 0.12],
                    color: 0xE87BA8, alpha: [0.5, 0], light: "full", maxParticles: 12
                },
                {
                    name: "gaze_glint", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.09, 0.01],
                    color: 0xFFE0EC, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        drop: {
            duration: 24,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "drop_symbols", bind: "target", height: 1.2,
                    particle: "world_combat_core:cobblemon/generic/crossedswords",
                    burst: { count: { data: "drop", fallback: 1 }, interval: 4, repeats: 2 }, shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "down", speed: [0.02, 0.05], spin: 8, gravity: 0.015,
                    lifetime: [10, 18], size: [0.32, 0.1],
                    color: 0xE87BA8, alpha: [0.85, 0], light: "full", maxParticles: 8
                },
                {
                    name: "drop_ring", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1, interval: 4, repeats: 2 }, shape: { kind: "ring", radius: 0.35 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [10, 16], size: [0.26, 0.1],
                    color: 0xFFE0EC, alpha: [0.55, 0], light: "full", maxParticles: 6
                }
            ]
        },
        linger: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "linger_glints", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 3, shape: { kind: "circle", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.08, 0.01], alphaMode: "sin",
                    color: 0xF7A8C4, alpha: [0.3, 0], light: "full", maxParticles: 12
                },
                {
                    name: "linger_orbs", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 3, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.08, 0.02],
                    color: 0xFFE0EC, alpha: [0.3, 0], light: "world", maxParticles: 12
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "blocked_fade", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 9, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.09, 0.02],
                    color: 0xCCC6CC, alpha: [0.4, 0], light: "world", maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xCCC6CC, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_babydolleyes", 1, BabydolleyesDefinition);
