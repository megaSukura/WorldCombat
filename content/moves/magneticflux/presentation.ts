/**
 * 磁场操控 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者压身成磁极，蓝白磁力线从身上绞出、一圈圈荡开成磁环；被咬住的正电／负电伙伴身上
 *   缠出极光护层，防御与特防抬起来。
 *
 * 色相家族：电蓝（0x4FC3E8）画磁场与护层，近白（0xE8F6FF）做磁力线高光，深蓝（0x1E5F86）做底色环；
 *   一个色相家族用明暗分两极，不引入第二个色相。
 * 层次：起（向内绞的磁力线）／立（外荡磁环＋磁场底）／持（磁场边界）／咬（伙伴身上的极光层）／收（磁力散去）。
 * 起击收：charge（起）→ pulse（击）→ field（持，随磁场续期）→ link／held（被咬住的人）→ fade（收）。
 * 范围：pulse 与 field 的磁环绑 `data.scale`（实际磁场半径 / 3.4），画面里的环就是会被咬住的范围。
 * 运动：磁力线由体内向心绞紧再向外荡；磁环一圈圈扩散；护层贴着伙伴向上缠绕。
 * 数：磁力线数绑 `data.arcs`（特攻派生），护层强度绑 `data.motes`（同源），范围与尺寸绑 `data.scale`（特攻与体型派生）。
 */
const MagneticFluxDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 18,
            exit: { stop: 6, drain: 16 },
            emitters: [
                {
                    name: "charge_arc", bind: "source", fit: "body", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 22 }, interval: 3, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.3 }, direction: "inward", speed: [0.03, 0.12], spin: 30,
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xE8F6FF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 90
                }
            ]
        },
        pulse: {
            duration: 42,
            exit: { stop: 16, drain: 26 },
            emitters: [
                {
                    name: "pulse_ring", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 26, repeats: 3, interval: 4 },
                    shape: { kind: "circle", radius: 3.4, thickness: 0.92 }, direction: "outward", speed: [0.1, 0.26],
                    lifetime: [16, 26], size: [0.4, 0.14], sizeMode: "index",
                    color: 0x4FC3E8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "pulse_arc", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "arcs", fallback: 22 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: 3.0 }, direction: "outward", speed: [0.1, 0.28], spin: 26,
                    lifetime: [8, 16], size: [0.14, 0.03],
                    color: 0xE8F6FF, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 200
                },
                {
                    name: "pulse_core", bind: "source", fit: "body", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_electric",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.5 }, direction: "outward", speed: [0.08, 0.22],
                    lifetime: [8, 14], size: [0.34, 0.06], sizeMode: "index",
                    color: 0x4FC3E8, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 40
                }
            ]
        },
        field: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "field_edge", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 10, shape: { kind: "circle", radius: 3.4, thickness: 0.96 },
                    direction: "up", speed: [0.004, 0.02], spin: 14,
                    lifetime: [30, 50], size: [0.1, 0.03],
                    color: 0x4FC3E8, alpha: [0.22, 0], alphaMode: "sin", light: "full", maxParticles: 50
                },
                {
                    name: "field_base", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 5, shape: { kind: "circle", radius: 3.1 },
                    direction: "up", speed: [0.004, 0.016],
                    lifetime: [24, 40], size: [0.05, 0.01],
                    color: 0x1E5F86, alpha: [0.16, 0], light: "world", maxParticles: 30
                }
            ]
        },
        link: {
            duration: 28,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "link_coil", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: { data: "motes", fallback: 12 }, interval: 5, repeats: 3 },
                    shape: { kind: "ring", radius: 0.55 }, direction: "outward", speed: [0.04, 0.14], spin: 28,
                    lifetime: [10, 18], size: [0.12, 0.03],
                    color: 0xE8F6FF, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "link_flash", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 }, direction: "up", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x4FC3E8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 30
                }
            ]
        },
        held: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "held_arc", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 3, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.008, 0.024], spin: 12,
                    lifetime: [14, 24], size: [0.08, 0.02],
                    color: 0x4FC3E8, alpha: [0.3, 0], light: "full", bloom: 0.2, maxParticles: 18
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "fade_arc", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/electricity/electricity_white",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.4 }, direction: "down", speed: [0.02, 0.08], spin: 20,
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0x1E5F86, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_magneticflux", 1, MagneticFluxDefinition);
