/**
 * 天使之吻 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者凑到对手脸前，在它身上炸开一团粉色的心，之后目标头顶一直飘着心与迷路的飞鸟。
 *
 * 色相家族：粉（0xFF8FB8）为主体，深粉（0xE0508A）只压在核心，近白只做高光小点。
 * 层次：凑近（起手）、落吻（接触处只一枚吻印，成功后贴在目标身上，不铺成区域）、余韵（头顶飘心）、
 *       打偏（心散的一顿）、亲空（没贴到时散开的一点心）。
 * 起击收：windup（凑近）→ kiss（亲上）→ linger（还在发懵）。
 * 数：接触处的细闪数量按服务端 data.hearts 派生，亲密度越高星点越密；吻印大小随 data.scale。
 */
const SweetkissDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            emitters: [
                {
                    name: "lean_heart", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 14, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [12, 20], size: [0.2, 0.08], sizeMode: "sin",
                    color: 0xFF8FB8, alpha: [0.6, 0], alphaMode: "sin", light: "full", maxParticles: 36
                },
                {
                    name: "lean_spark", bind: "source", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.36 },
                    direction: "inward", speed: [0.02, 0.05],
                    lifetime: [10, 16], size: [0.09, 0.02],
                    color: 0xFFD0E4, alpha: [0.9, 0], light: "full", maxParticles: 24
                }
            ]
        },
        kiss: {
            duration: 40,
            emitters: [
                {
                    name: "kiss_mark", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.0],
                    lifetime: [18, 28], size: [0.42, 0.32], sizeMode: "sin",
                    color: 0xFF8FB8, alpha: [0.95, 0], light: "full", maxParticles: 4
                },
                {
                    name: "kiss_spark", bind: "target", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: { data: "hearts", fallback: 10 } }, shape: { kind: "sphere_surface", radius: 0.18 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xFFD0E4, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        linger: {
            exit: { drain: 36 },
            emitters: [
                {
                    name: "linger_heart", bind: "target", offset: [0, 0.35, 0], height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 4, shape: { kind: "circle", radius: 0.34 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [20, 30], size: [0.18, 0.07], sizeMode: "sin",
                    color: 0xFF8FB8, alpha: [0.42, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "linger_bird", bind: "target", offset: [0, 0.15, 0], height: 0.95,
                    particle: "world_combat_core:cobblemon/generic/status/confusion_bird",
                    rate: 3, shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 28], size: [0.16, 0.06],
                    color: 0xE0508A, alpha: [0.35, 0], light: "full", maxParticles: 14
                }
            ]
        },
        fumble: {
            duration: 24,
            emitters: [
                {
                    name: "fumble_heart", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 16, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16], drag: 0.92,
                    lifetime: [10, 18], size: [0.2, 0.05],
                    color: 0xE0508A, alpha: [0.8, 0], light: "full", maxParticles: 40
                },
                {
                    name: "fumble_smoke", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/largeobscure_pink",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [16, 26], size: [0.2, 0.28],
                    color: 0xE0508A, alpha: [0.2, 0], light: "world", maxParticles: 24
                }
            ]
        },
        fizzle: {
            duration: 18,
            emitters: [
                {
                    name: "fizzle_heart", bind: "point", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xFF8FB8, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sweetkiss", 1, SweetkissDefinition);
