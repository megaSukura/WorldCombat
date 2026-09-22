/**
 * 奇迹之眼 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者额前凝起一只淡紫的眼睛，一道心眼线穿到对手身上；对手被两圈紫青念环由外向内收住，
 *   心眼窗口里一直有念环在它身上转。
 *
 * 色相家族：念紫（0xB07CE8）做心眼主体，青（0x7CD8E8）做瞳孔环高光，淡紫白（0xE0C8FF）做细节。
 * 层次：凝神（起手，念光向额前收）→ 看穿（一条心眼线＋目标两圈念环＋心眼火花）→ 持眼（低密度念环）
 *   → 褪去／被挡／落空。
 * 起击收：windup（凝神）→ read（看穿）→ hold（持眼，慢慢离场）→ fade（走空）。
 * 范围：单体心眼，心眼线与目标念环画的正是被看穿的那个人；心眼距离由 reach 决定，画面沿视线铺开。
 * 运动：心眼线从施法者沿视线飞向目标（bind path polyline），念环由外向内收；持眼时念环在目标身上慢转。
 * 数：心眼线与念环的密度读 data.motes（特攻派生），抬起的命中级数读 data.added（决定念环层数与亮度）。
 */
const MiracleeyeDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_eye", bind: "source", height: 1.35,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    rate: 12, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE0C8FF, alpha: [0.55, 0], light: "full", maxParticles: 26
                }
            ]
        },
        read: {
            duration: 32,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "eye_line", bind: "path", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 14 }, direction: "shape", speed: [0.05, 0.16], spread: 14,
                    lifetime: [10, 18], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xB07CE8, alpha: [0.85, 0], light: "full", maxParticles: 74
                },
                {
                    name: "eye_rings", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: { data: "added", fallback: 2 }, interval: 4, repeats: 2 }, shape: { kind: "ring", radius: 0.46 },
                    direction: "inward", speed: [0.05, 0.13],
                    lifetime: [12, 20], size: [0.34, 0.12],
                    color: 0x7CD8E8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                },
                {
                    name: "eye_halo", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 18], size: [0.3, 0.1],
                    color: 0xB07CE8, alpha: [0.5, 0], light: "full", maxParticles: 44
                },
                {
                    name: "eye_spark", bind: "source", height: 1.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 8 }, shape: { kind: "sphere_surface", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.08, 0.01],
                    color: 0xE0C8FF, alpha: [0.9, 0], light: "full", maxParticles: 20
                }
            ]
        },
        hold: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "hold_eye", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "motes", fallback: 6 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.06], spin: 4,
                    lifetime: [12, 20], size: [0.12, 0.02], alphaMode: "sin",
                    color: 0xB07CE8, alpha: [0.34, 0], light: "full", maxParticles: 22
                }
            ]
        },
        fade: {
            duration: 22,
            emitters: [
                {
                    name: "fade_eye", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.09, 0.01],
                    color: 0xB07CE8, alpha: [0.35, 0], light: "world", maxParticles: 22
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
                    color: 0xC8C0D8, alpha: [0.4, 0], light: "world", maxParticles: 18
                }
            ]
        },
        fizzle: {
            duration: 16,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC8C0D8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_miracleeye", 1, MiracleeyeDefinition);
