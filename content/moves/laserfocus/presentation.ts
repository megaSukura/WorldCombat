/**
 * 磨砺 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者收束精神，一道竖直的金色锐光贴着自己收紧成一条细线（身上留一圈低密度锐光）；
 *   下一次出手命中要害的一刻，目标身上炸开一记金色十字刃光与密集光点。
 *
 * 色相家族：暖金（0xFFC24A／0xFFB84A）为主体，近白黄（0xFFE08A／0xFFF6DC）只做刃光与高光小点，
 *   灰白（0xE8E0CC）收地面细尘。没有第二个色相。
 * 层次：收束（起手，光点向内收成一条线）→ 落点（身上一柱锐光＋脚边金环＋十字刃光）→ 持锐（低密度光点）
 *   → 要害（目标迸发）→ 褪去。
 * 起击收：windup（收束）→ focus（落点）→ aura（持锐，慢慢离场）→ crit（兑现的要害）／fade（没兑现）。
 * 范围：磨砺只作用于自身，锐光柱的长度读 data.edge（身高派生），脚环半径按同一尺度；画面读得出一束自光。
 * 运动：起手光点由外向内收；落点光柱竖在身体上、脚环向外扩；持锐光点缓慢上浮；要害向外炸开后收束。
 * 数：光柱与脚环的密度读 data.motes（物攻派生），要害迸发读 data.spark 与命中强度 data.intensity。
 */
const LaserfocusDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "gather_motes", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    rate: 14, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [8, 15], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xFFC24A, alpha: [0.7, 0], light: "full", maxParticles: 34
                },
                {
                    name: "gather_sparks", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 9, shape: { kind: "sphere", radius: 0.35 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFFF6DC, alpha: [0.85, 0], light: "full", maxParticles: 24
                }
            ]
        },
        focus: {
            duration: 32,
            exit: { stop: 16, drain: 16 },
            emitters: [
                {
                    name: "edge_column", bind: "source", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/lightbeam",
                    shape: { kind: "line", length: { data: "edge", fallback: 1.4 } },
                    orient: "fixed", rate: 10, direction: "up", speed: 0,
                    lifetime: [10, 16], size: [0.22, 0.1],
                    color: 0xFFE08A, alpha: [0.5, 0], light: "full", maxParticles: 40
                },
                {
                    name: "focus_core", bind: "source", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/orb/orb",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.13],
                    lifetime: [10, 18], size: [0.13, 0.02], sizeMode: "sin",
                    color: 0xFFC24A, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 70
                },
                {
                    name: "focus_ring", bind: "source", height: 0.05,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "ring", radius: 0.7 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [12, 18], size: [0.32, 0.14],
                    color: 0xFFB84A, alpha: [0.45, 0], light: "full", maxParticles: 40
                },
                {
                    name: "focus_blades", bind: "source", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/crossedswords",
                    burst: { count: 2, interval: 4, repeats: 2 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.03, 0.09], spin: 7,
                    lifetime: [12, 20], size: [0.3, 0.12],
                    color: 0xFFF6DC, alpha: [0.9, 0], light: "full", bloom: 0.2, maxParticles: 16
                }
            ]
        },
        aura: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "aura_motes", bind: "source", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorb",
                    rate: 4, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [14, 22], size: [0.08, 0.02],
                    color: 0xFFE08A, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 12
                }
            ]
        },
        crit: {
            duration: 28,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "crit_burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/bigsparkle",
                    burst: { count: { data: "spark", fallback: 24 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 32,
                    lifetime: [10, 20], size: [0.24, 0.04], sizeMode: "index",
                    color: 0xFFC24A, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 90
                },
                {
                    name: "crit_blades", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/crossedswords",
                    burst: { count: 2 }, shape: { kind: "sphere_surface", radius: 0.35 },
                    direction: "outward", speed: [0.05, 0.14], spin: 10,
                    lifetime: [12, 20], size: [0.42, 0.16],
                    color: 0xFFF6DC, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 14
                },
                {
                    name: "crit_ring", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [12, 18], size: [0.4, 0.14],
                    color: 0xFFE08A, alpha: [0.6, 0], light: "full", maxParticles: 8
                },
                {
                    name: "crit_dust", bind: "target", height: 0.08,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1], drag: 0.9, gravity: 0.01,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xE8E0CC, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        fade: {
            duration: 22,
            emitters: [
                {
                    name: "fade_motes", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.09, 0.01],
                    color: 0xFFE08A, alpha: [0.35, 0], light: "world", maxParticles: 26
                },
                {
                    name: "fade_dust", bind: "source", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.02, 0.06], drag: 0.9,
                    lifetime: [10, 16], size: [0.06, 0.01],
                    color: 0xE8E0CC, alpha: [0.35, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_laserfocus", 1, LaserfocusDefinition);
