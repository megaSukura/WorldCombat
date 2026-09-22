/**
 * 识破 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者眼中亮起一线锐光，顺着视线打到对手身上；对手被一圈冷白的「瞳孔环」套住并亮起轮廓，
 *   识破窗口内一直有细环在它身上慢慢转，直到印记褪去。
 *
 * 色相家族：冷白（0xE8F4FF）做目光主体，淡蓝（0xC9E4FF）做瞳孔环与余韵，灰白（0xC6D0DC）收尘。
 * 层次：凝目（起手，目光在眼内收束）→ 看穿（一条视线＋目标瞳孔环＋轮廓火花）→ 持识（低密度细环）
 *   → 褪去／被挡／落空。
 * 起击收：windup（凝目）→ read（看穿）→ hold（持识，慢慢离场）→ fade（走空）。
 * 范围：单体识破，视线与目标瞳孔环画的正是被看穿的那个人；识破距离由 reach 决定，画面沿视线铺开。
 * 运动：视线从施法者沿视线飞向目标（bind path polyline），瞳孔环由外向内收；持识时细环在目标身上转动。
 * 数：视线与瞳孔环的密度读 data.motes（物攻派生），剥掉的闪避级数读 data.taken（决定环的层数与亮度）。
 */
const ForesightDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gather_gaze", bind: "source", height: 1.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.08, 0.02], sizeMode: "sin",
                    color: 0xE8F4FF, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        read: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "sight_line", bind: "path", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 12 }, direction: "shape", speed: [0.05, 0.16], spread: 14,
                    lifetime: [9, 16], size: [0.11, 0.03], sizeMode: "sin",
                    color: 0xE8F4FF, alpha: [0.85, 0], light: "full", maxParticles: 64
                },
                {
                    name: "iris_rings", bind: "target", height: 0.75,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "taken", fallback: 2 }, interval: 4, repeats: 2 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.05, 0.13],
                    lifetime: [12, 20], size: [0.34, 0.12],
                    color: 0xC9E4FF, alpha: [0.7, 0], light: "full", bloom: 0.2, maxParticles: 28
                },
                {
                    name: "outline_spark", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: { data: "motes", fallback: 12 } }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xE8F4FF, alpha: [0.9, 0], light: "full", maxParticles: 32
                },
                {
                    name: "eye_flash", bind: "source", height: 1.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/mediumsparkle",
                    burst: { count: 5 }, shape: { kind: "sphere", radius: 0.16 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.12, 0.03],
                    color: 0xE8F4FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 12
                }
            ]
        },
        hold: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "hold_ring", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    rate: { data: "motes", fallback: 6 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.02, 0.06], spin: 3,
                    lifetime: [12, 20], size: [0.1, 0.02], alphaMode: "sin",
                    color: 0xC9E4FF, alpha: [0.34, 0], light: "full", maxParticles: 20
                }
            ]
        },
        fade: {
            duration: 22,
            emitters: [
                {
                    name: "fade_gaze", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.09, 0.01],
                    color: 0xC9E4FF, alpha: [0.35, 0], light: "world", maxParticles: 22
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
                    color: 0xC6D0DC, alpha: [0.4, 0], light: "world", maxParticles: 18
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
                    color: 0xC6D0DC, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_foresight", 1, ForesightDefinition);
