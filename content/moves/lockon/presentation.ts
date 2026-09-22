/**
 * 锁定 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：一道青色的准星线从施法者咬到对手身上，两圈准星环由外向内收拢、把它框在中心；命中锁住的目标时
 *   准星炸开成青白火花。
 *
 * 色相家族：准星青（0x6FD8FF／0x3FB0E8）为主体，近白青（0xDFF6FF）只做火花与角标，灰白（0xC6D8E0）收尘。
 * 层次：咬上（起手，准星光点向枪口收）→ 锁死（准星线＋两圈收拢的准星环＋四角标记）→ 持锁（低密度准星线）
 *   → 兑现（准星炸开）→ 褪去。
 * 起击收：windup（咬上）→ lock（锁死）→ link（持锁，慢慢离场）→ strike（兑现）／fade（走空）。
 * 范围：单体锁定，准星环画的正是被锁住的那个人；锁定距离由 reach 决定，画面沿视线铺开。
 * 运动：准星线从施法者沿视线飞向目标（bind path polyline），两圈准星环由外向内收；兑现时火花向外炸开。
 * 数：准星线与火花的密度读 data.motes（物攻派生），是否钉死读 data.held（钉死时加一层更亮的青环）。
 */
const LockonDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 13,
            exit: { stop: 5, drain: 11 },
            emitters: [
                {
                    name: "gather_lock", bind: "source", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 13, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 14], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xDFF6FF, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        },
        lock: {
            duration: 30,
            exit: { stop: 15, drain: 18 },
            emitters: [
                {
                    name: "lock_line", bind: "path", offset: [0, 0.9, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 14 }, direction: "shape", speed: [0.05, 0.16], spread: 14,
                    lifetime: [8, 15], size: [0.11, 0.03], sizeMode: "sin",
                    color: 0x6FD8FF, alpha: [0.85, 0], light: "full", maxParticles: 70
                },
                {
                    name: "lock_reticle", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/ring/xlring",
                    burst: { count: 3, interval: 4, repeats: 2 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.12],
                    lifetime: [12, 20], size: [0.4, 0.16],
                    color: 0x3FB0E8, alpha: [0.6, 0], light: "full", maxParticles: 30
                },
                {
                    name: "lock_frame", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 4 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.1], roll: 45, spin: 4,
                    lifetime: [12, 18], size: [0.24, 0.1],
                    color: 0xDFF6FF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 22
                },
                {
                    name: "lock_corners", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.02, 0.07],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xDFF6FF, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        link: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "link_lock", bind: "path", offset: [0, 0.9, 0],
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 7 }, direction: "shape", speed: [0.03, 0.1], spread: 12,
                    lifetime: [12, 20], size: [0.08, 0.02], alphaMode: "sin",
                    color: 0x6FD8FF, alpha: [0.34, 0], light: "full", maxParticles: 24
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "strike_spark", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2], spread: 28,
                    lifetime: [10, 20], size: [0.22, 0.05], sizeMode: "index",
                    color: 0x6FD8FF, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "strike_rings", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 3, interval: 3 }, shape: { kind: "ring", radius: 0.45 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [12, 18], size: [0.34, 0.12],
                    color: 0xDFF6FF, alpha: [0.6, 0], light: "full", maxParticles: 14
                },
                {
                    name: "strike_dust", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.09], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xC6D8E0, alpha: [0.4, 0], light: "world", maxParticles: 26
                }
            ]
        },
        fade: {
            duration: 22,
            emitters: [
                {
                    name: "fade_lock", bind: "source", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.09, 0.01],
                    color: 0x6FD8FF, alpha: [0.35, 0], light: "world", maxParticles: 24
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
                    rate: 9, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xC6D8E0, alpha: [0.4, 0], light: "world", maxParticles: 20
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
                    color: 0xC6D8E0, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lockon", 1, LockonDefinition);
