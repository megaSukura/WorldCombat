/**
 * 健美 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者把胸口一绷，赤红的气劲从身上鼓开一下定住；偏攻是自内向外炸开的火星（拳头），
 *   偏守是向体内收拢的暖光壳（护体），两种标识形状不同、不靠颜色猜；松劲时气劲散去。
 *
 * 色相家族：赤陶红（0xE0603C）为主体，暖橙（0xF2A25A）做高光与火星，暗红（0x8A3B28）做烟与余韵；没有第二个色相。
 * 起击收：brace（起势）→ swell_power／swell_guard（绷紧）→ aura（维持）→ relax（松劲）。
 * 范围：气环绑身上、fit body，按 data.scale（鼓身半径 / 1.4）缩放；维持期由真实窗口驱动、没有长时间独立光圈。
 * 数：火星量绑 data.sparks（攻防派生），鼓动拍数绑 data.pulses（表现内部参数，默认 2 拍），尺寸与范围绑 data.scale（体型派生）。
 */
const BulkUpDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "brace_ember", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 1.2 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 14,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xF2A25A, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 36
                }
            ]
        },
        swell_power: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "power_burst", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "sparks", fallback: 22 }, interval: 4, repeats: { data: "pulses", fallback: 2 } },
                    shape: { kind: "cone_volume", radius: 0.5, length: 0.9, angleDegrees: 35 },
                    direction: "outward", speed: [0.14, 0.3], gravity: -0.004, drag: 0.88, spin: 24,
                    lifetime: [10, 18], size: [0.15, 0.03],
                    color: 0xF2A25A, alpha: [0.9, 0], light: "full", bloom: 0.45, maxParticles: 160
                },
                {
                    name: "power_smoke", bind: "source", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [16, 28], size: [0.3, 0.6],
                    color: 0x8A3B28, alpha: [0.22, 0], light: "world", maxParticles: 32
                }
            ]
        },
        swell_guard: {
            duration: 30,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "guard_shell", bind: "source", fit: "none", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: { data: "sparks", fallback: 22 }, interval: 4, repeats: { data: "pulses", fallback: 2 } },
                    shape: { kind: "hemisphere", radius: 0.75, thickness: 0.6 },
                    direction: "inward", speed: [0.05, 0.16], drag: 0.9, spin: 10,
                    lifetime: [12, 20], size: [0.16, 0.05],
                    color: 0xE0603C, alpha: [0.6, 0], light: "world", bloom: 0.25, maxParticles: 120
                },
                {
                    name: "guard_mote", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08], gravity: -0.001,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xF2A25A, alpha: [0.5, 0], light: "full", maxParticles: 32
                }
            ]
        },
        aura: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "aura_glow", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 3, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.012, 0.028], spin: 12,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xF2A25A, alpha: [0.32, 0], light: "full", bloom: 0.3, maxParticles: 18
                }
            ]
        },
        relax: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "relax_ember", bind: "source", fit: "none", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.015, drag: 0.92, spin: 18,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0x8A3B28, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_bulkup", 1, BulkUpDefinition);
