/**
 * 奇迹之眼 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者额前凝起一只淡紫的眼睛，一道心眼线连到对手身上；对手被两圈紫青念环收住，同时施法者自己头上
 *   亮起一圈小准星——目标环与自准星是两条独立的生命周期，谁先到期就先 fade。
 *
 * 色相家族：念紫（0xB07CE8）做心眼主体，青（0x7CD8E8）做瞳孔环与自准星，淡紫白（0xE0C8FF）做细节。
 * 层次：凝神（起手，念光向额前收）→ 看穿（一条心眼线＋目标两圈念环＋心眼火花）
 *   ＋ 自照（施法者头上的小准星亮起）→ 持眼（目标低密度念环、自己准星慢转，各自随自身的托管效果结束）
 *   → 褪去／自照收束／被挡／落空。
 * 起击收：windup（凝神）→ focus（自照亮起）→ read（看穿）→ hold＋focus_hold（两端持续）→ fade／focus_end（各自走空）。
 * 范围：单体心眼，心眼线与目标念环画的正是被看穿的那个人；心眼距离由 reach 决定。
 * 运动：心眼线是施法者与目标之间一条瞬时直线（bind path + shape polyline，整条边同时采样，不是沿线飞行的前沿）；
 *   念环由外向内收；自准星绕自己的头慢转，绑在本次命中窗口这条托管效果上。
 * 数：心眼线与念环的密度读 data.motes（特攻派生），抬起的命中级数读 data.added（决定念环层数与自准星亮度）。
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
        focus: {
            duration: 24,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "focus_flash", bind: "source", height: 1.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "added", fallback: 2 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x7CD8E8, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 20
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
                    name: "self_reticle", bind: "source", height: 1.35,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: { data: "added", fallback: 2 } }, shape: { kind: "ring", radius: 0.24 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [10, 16], size: [0.2, 0.08],
                    color: 0x7CD8E8, alpha: [0.85, 0], light: "full", maxParticles: 24
                }
            ]
        },
        focus_hold: {
            exit: { drain: 18 },
            emitters: [
                {
                    name: "reticle", bind: "source", height: 1.4,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: { data: "added", fallback: 4 }, shape: { kind: "ring", radius: 0.22 },
                    direction: "inward", speed: [0.01, 0.04], spin: 5,
                    lifetime: [10, 16], size: [0.1, 0.02], alphaMode: "sin",
                    color: 0x7CD8E8, alpha: [0.4, 0], light: "full", maxParticles: 16
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
        focus_end: {
            duration: 20,
            emitters: [
                {
                    name: "reticle_loose", bind: "source", height: 1.4,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 10 }, shape: { kind: "ring", radius: 0.22 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [10, 16], size: [0.08, 0.01],
                    color: 0x7CD8E8, alpha: [0.4, 0], light: "world", maxParticles: 18
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
