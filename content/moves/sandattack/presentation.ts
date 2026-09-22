/**
 * 泼沙 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者低头刨起脚下一把地面，朝目标踢开一片扇形的砂砾，糊在脸上；砂粒的颜色就是脚下那块方块的颜色。
 *
 * 色相家族：由服务端 data.tint 定的单一土色（沙黄／砂砾灰／泥褐）为主体，浅一档的同类土色只做细节，
 *   没有第二个色相。tint 来自真实方块，所以沙地扬沙、石地扬灰。
 * 层次：脚边扬尘（起手）→ 扇形砂流（飞行，张角由 data.angle 画出）→ 脸上溅沙（命中）→ 余尘（持续）。
 * 起击收：gather（刨地）→ spray（扇形踢出）→ splat（落到脸上或 fizzle 落空）→ linger（眼里还有沙）。
 * 数：砂流的发射量绑定 data.grains（身高换算），张角绑定 data.angle（体型换算），溅沙量也读 data.grains。
 */
const SandAttackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 16,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "gather_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 26, shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.07], gravity: 0.02,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xBFA77A, alpha: [0.7, 0], light: "world", maxParticles: 40
                },
                {
                    name: "gather_clod", bind: "source", offset: [0, 0.08, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    rate: 6, shape: { kind: "circle", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.05], spin: 10,
                    lifetime: [10, 16], size: [0.14, 0.04],
                    color: 0xA98B58, alpha: [0.5, 0], light: "world", maxParticles: 14
                }
            ]
        },
        spray: {
            duration: 14,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "spray_grit", bind: "source", offset: [0, 0.12, 0], height: 0.12,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "grains", fallback: 34 } },
                    direction: [{ data: "direction.0", fallback: 1 }, { data: "direction.1", fallback: 0 }, { data: "direction.2", fallback: 0 }],
                    spread: { data: "angle", fallback: 65 }, speed: [0.25, 0.5], gravity: 0.035, drag: 0.93,
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: { data: "tint", fallback: 0xBFA77A }, alpha: [0.95, 0], light: "world", maxParticles: 140
                },
                {
                    name: "spray_clods", bind: "source", offset: [0, 0.14, 0], height: 0.14,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "grains", fallback: 10 } },
                    direction: [{ data: "direction.0", fallback: 1 }, { data: "direction.1", fallback: 0 }, { data: "direction.2", fallback: 0 }],
                    spread: { data: "angle", fallback: 45 }, speed: [0.18, 0.36], gravity: 0.03, drag: 0.9, spin: 14,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: { data: "tint", fallback: 0xA98B58 }, alpha: [0.8, 0], light: "world", maxParticles: 50
                }
            ]
        },
        splat: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "splat_face", bind: "target", height: 0.82,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ground",
                    burst: { count: { data: "grains", fallback: 20 } }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.06, 0.22], spread: 30, gravity: 0.03, drag: 0.9,
                    lifetime: [8, 14], size: [0.14, 0.03], sizeMode: "index",
                    color: { data: "tint", fallback: 0xBFA77A }, alpha: [0.95, 0], light: "world", maxParticles: 70
                },
                {
                    name: "splat_dust", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "grains", fallback: 18 } }, shape: { kind: "sphere_surface", radius: 0.22 },
                    direction: "outward", speed: [0.05, 0.18], gravity: 0.05, drag: 0.92,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: { data: "tint", fallback: 0xBFA77A }, alpha: [0.8, 0], light: "world", maxParticles: 60
                },
                {
                    name: "splat_ring", bind: "target", height: 0.65,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.26, 0.55],
                    color: { data: "tint", fallback: 0xBFA77A }, alpha: [0.5, 0], light: "world", maxParticles: 4
                }
            ]
        },
        fizzle: {
            duration: 18,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: { data: "tint", fallback: 0xBFA77A }, alpha: [0.4, 0], light: "world", maxParticles: 30
                }
            ]
        },
        linger: {
            duration: { data: "tick", fallback: 60 },
            exit: { drain: 24 },
            emitters: [
                {
                    name: "linger_grit", bind: "target", offset: [0, 0.3, 0], height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 4, shape: { kind: "circle", radius: 0.2 },
                    direction: "down", speed: [0.01, 0.03], gravity: 0.03,
                    lifetime: [12, 20], size: [0.05, 0.01],
                    color: 0xBFA77A, alpha: [0.35, 0], light: "world", maxParticles: 14
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_sandattack", 1, SandAttackDefinition);
