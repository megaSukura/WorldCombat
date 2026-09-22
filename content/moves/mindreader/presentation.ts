/**
 * 心之眼 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者凝神，一串淡紫的思绪沿视线牵到对手身上，眼睛处的念环张开、对手被一圈读光罩住；
 *   下一次命中落下时，读光从对手身上散成念波。
 *
 * 色相家族：念紫（0xB07CE8／0x8A5CD0）为主体，近白紫（0xE8D8FF）只做思绪高光，灰白（0xCFC6D8）收尘。
 * 层次：凝神（起手，思绪向眼内收）→ 读穿（一条思绪线＋眼睛念环＋目标读光环）→ 持读（低密度思绪线）
 *   → 兑现（念波散开）→ 褪去。
 * 起击收：windup（凝神）→ read（读穿）→ link（持读，慢慢离场）→ strike（兑现）／fade（走空）。
 * 范围：单体读，思绪线与目标读环画的正是被读的那个人；读距离由 reach 决定，画面沿视线铺开。
 * 运动：思绪从施法者沿视线飞向目标（bind path polyline），目标读环由外向内收；兑现时念波向外散。
 * 数：思绪线与念环的密度读 data.motes（特攻派生），照亮时长读 data.reveal，兑现强度读 data.intensity。
 */
const MindreaderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather_thought", bind: "source", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [10, 18], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE8D8FF, alpha: [0.5, 0], light: "full", maxParticles: 26
                }
            ]
        },
        read: {
            duration: 30,
            exit: { stop: 16, drain: 18 },
            emitters: [
                {
                    name: "read_line", bind: "path", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_large",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 14 }, direction: "shape", speed: [0.05, 0.16], spread: 16,
                    lifetime: [10, 18], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xB07CE8, alpha: [0.8, 0], light: "full", maxParticles: 70
                },
                {
                    name: "read_eyes", bind: "source", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring1",
                    burst: { count: 8, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.34 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 18], size: [0.22, 0.06],
                    color: 0xE8D8FF, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 24
                },
                {
                    name: "read_halo", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "ring", radius: 0.45 },
                    direction: "inward", speed: [0.04, 0.09],
                    lifetime: [12, 18], size: [0.3, 0.12],
                    color: 0x8A5CD0, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "read_spark", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    burst: { count: 12 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [12, 20], size: [0.08, 0.01],
                    color: 0xE8D8FF, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        link: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "link_thought", bind: "path", offset: [0, 1.0, 0],
                    particle: "world_combat_core:cobblemon/generic/thought_trail_small",
                    shape: { kind: "polyline" },
                    rate: { data: "motes", fallback: 7 }, direction: "shape", speed: [0.03, 0.1], spread: 12,
                    lifetime: [12, 20], size: [0.09, 0.02], alphaMode: "sin",
                    color: 0xB07CE8, alpha: [0.32, 0], light: "full", maxParticles: 24
                }
            ]
        },
        strike: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "strike_wave", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.18], spread: 26,
                    lifetime: [12, 20], size: [0.26, 0.06], sizeMode: "index",
                    color: 0xB07CE8, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 70
                },
                {
                    name: "strike_rings", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2, interval: 3 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.15],
                    lifetime: [12, 18], size: [0.36, 0.12],
                    color: 0x8A5CD0, alpha: [0.55, 0], light: "full", maxParticles: 12
                },
                {
                    name: "strike_dust", bind: "target", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.09], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xCFC6D8, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fade: {
            duration: 22,
            emitters: [
                {
                    name: "fade_thought", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.09, 0.01],
                    color: 0xB07CE8, alpha: [0.35, 0], light: "world", maxParticles: 24
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
                    color: 0xCFC6D8, alpha: [0.4, 0], light: "world", maxParticles: 20
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
                    color: 0xCFC6D8, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_mindreader", 1, MindreaderDefinition);
