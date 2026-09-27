/**
 * 天使之吻 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把脸凑到对手脸上，在真实接触点落下一枚吻印；状态生效后，目标头顶开始飘心与迷路的飞鸟。
 *
 * 色相家族：粉（0xFF8FB8）为主体，深粉（0xE0508A）只压在核心，近白只做高光小点。
 * 层次：凑近（起手，脸色前侧一收）、落吻（真实触点只一枚吻印，不铺成区域）、余韵（托管载体期间头顶飘心）、
 *       打偏（反噬时心散的一顿）、亲空（没贴到时散开的一点白心）。没有飞出去的球。
 * 起击收：windup（凑近）→ kiss（贴到就落印）→ linger（还在发懵）。
 * 位置：kiss 的吻印与高光都落在服务端 trace 给出的真实接触点（bind:point），不是目标中心。
 * 数：接触处的细闪数量按服务端 data.hearts 派生，亲密度越高星点越密；吻印大小随 data.scale。
 */
const SweetkissDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            emitters: [
                {
                    name: "face_glow", bind: "source", height: 0.72,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "inward", speed: [0.02, 0.05],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xFFD0E4, alpha: [0.9, 0], light: "full", maxParticles: 20
                }
            ]
        },
        kiss: {
            duration: 40,
            emitters: [
                {
                    name: "kiss_mark", bind: "point", height: 0.72, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: 1 }, shape: { kind: "point" },
                    direction: "up", speed: [0.0, 0.0],
                    lifetime: [18, 28], size: [0.42, 0.32], sizeMode: "sin",
                    color: 0xFF8FB8, alpha: [0.95, 0], light: "full", maxParticles: 4
                },
                {
                    name: "kiss_spark", bind: "point", height: 0.72, fit: "none",
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
                    name: "fizzle_heart", bind: "point", height: 0.7, fit: "none",
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
