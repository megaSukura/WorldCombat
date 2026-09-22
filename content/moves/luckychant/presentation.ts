/**
 * 幸运咒语 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者仰头唱咒，一圈星尘从脚下升起、头顶的星光连成一环罩住它和队友；对手以为要打中要害时，
 * 一束星光轻轻把那一下拨开；祝福走到尽头，星光安静地收。
 *
 * 色相家族：祝福金（0xFFD26E）为主体，近白（0xFFF0BF）做高光，暖白（0xE8C980）做余韵。
 * 一个效果一个色相家族。持续层压得很低、放在头顶与脚边，让出目标本体视线。
 * 层次：仰头聚星（起手）／天光柱＋星环（罩住一圈）／头顶星光（持续）／拨开要害（事件）／收。
 * 起击收：windup（聚星）→ chant（星环铺开）→ warded（持续）→ guard（拨开一次暴击）→ fade（收）。
 * 数：铺开的星尘量绑定服务端算出的 data.motes；天光半径绑定 data.field；
 * 拨开要害的爆发量绑定实际被省下的伤害（data.saved 派生的 motes 与 saved）。
 */
const LuckychantDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "gather_star", bind: "source", offset: [0, 1.15, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: 6, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [14, 22], size: [0.2, 0.06], sizeMode: "sin",
                    color: 0xFFF0BF, alpha: [0.8, 0], light: "full", bloom: 0.25, maxParticles: 22
                },
                {
                    name: "gather_note", bind: "source", offset: [0, 1.0, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/note",
                    burst: { count: 3, interval: 5, repeats: 2 }, shape: { kind: "circle", radius: 0.32 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [16, 26], size: [0.18, 0.05],
                    color: 0xFFD26E, alpha: [0.6, 0], light: "full", maxParticles: 12
                }
            ]
        },
        chant: {
            duration: 46,
            exit: { stop: 16, drain: 32 },
            emitters: [
                {
                    name: "chant_ring", bind: "source", height: 0.05, offset: [0, 0.04, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 36 }, shape: { kind: "ring", radius: { data: "field", fallback: 3.5 } },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.36, 0.16],
                    color: 0xFFF0BF, alpha: [0.55, 0], light: "full", maxParticles: 70
                },
                {
                    name: "chant_stars", bind: "source", offset: [0, 1.1, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: { data: "motes", fallback: 24 } }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.9,
                    lifetime: [18, 30], size: [0.24, 0.05], sizeMode: "index",
                    color: 0xFFD26E, alpha: [0.85, 0], light: "full", bloom: 0.25, maxParticles: 90
                },
                {
                    name: "chant_sparkle", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 14, interval: 4, repeats: 3 }, shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [16, 28], size: [0.14, 0.03], sizeMode: "sin",
                    color: 0xFFF0BF, alpha: [0.7, 0], light: "full", maxParticles: 60
                },
                {
                    name: "chant_dust", bind: "source", height: 0.02,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 20 }, shape: { kind: "ring", radius: { data: "field", fallback: 3.5 } },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.94,
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0xE8C980, alpha: [0.4, 0], light: "world", maxParticles: 40
                }
            ]
        },
        warded: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "ward_star", bind: "target", offset: [0, 1.12, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/star",
                    rate: 3, shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.005, 0.025],
                    lifetime: [20, 32], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xFFD26E, alpha: [0.4, 0], alphaMode: "sin", light: "full", maxParticles: 16
                },
                {
                    name: "ward_glow", bind: "target", offset: [0, 0.03, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/orb/xsunboost",
                    rate: 2, shape: { kind: "ring", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [22, 34], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xFFF0BF, alpha: [0.24, 0], light: "full", maxParticles: 12
                }
            ]
        },
        guard: {
            duration: 26,
            exit: { stop: 9, drain: 22 },
            emitters: [
                {
                    name: "guard_flash", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/moves/wish_star",
                    burst: { count: { data: "motes", fallback: 24 } }, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "inward", speed: [0.06, 0.2], drag: 0.9,
                    lifetime: [10, 18], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xFFF0BF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 60
                },
                {
                    name: "guard_spark", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16],
                    lifetime: [8, 14], size: [0.14, 0.02], sizeMode: "index",
                    color: 0xFFD26E, alpha: [0.85, 0], light: "full", bloom: 0.2, maxParticles: 26
                }
            ]
        },
        fade: {
            duration: 34,
            exit: { stop: 12, drain: 28 },
            emitters: [
                {
                    name: "fade_stars", bind: "target", offset: [0, 1.05, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [20, 32], size: [0.18, 0.02],
                    color: 0xE8C980, alpha: [0.5, 0], light: "full", maxParticles: 30
                },
                {
                    name: "fade_ring", bind: "target", height: 0.04,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 }, shape: { kind: "ring", radius: { data: "field", fallback: 3.5 } },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.94,
                    lifetime: [16, 28], size: [0.24, 0.06],
                    color: 0xE8C980, alpha: [0.3, 0], light: "world", maxParticles: 34
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_luckychant", 1, LuckychantDefinition);
