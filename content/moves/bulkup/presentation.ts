/**
 * 健美 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者绷紧全身，赤红的气浪从体内一拍拍向外鼓开，脚下尘被顶起、火星沿肌肉的节律升腾；
 *   涨起来的身形在一圈暖光里维持着，松劲时气浪散去。
 *
 * 色相家族：赤陶红（0xE0603C）为主体，暖橙（0xF2A25A）做高光与火星，暗红（0x8A3B28）做烟与余韵；没有第二个色相。
 * 层次：收势（起）／气环、火星与烟（击）／贴身的暖光（收）／散开（末）。
 * 起击收：brace（起势）→ swell（涨身）→ aura（维持）→ relax（松劲）。
 * 范围：气环绑脚点、fit none，半径按 `data.scale`（实际涨起半径 / 1.4）推出，画出来的圈就是气场推到的范围。
 * 运动：火星由体内向外冲；气环一拍拍向外推开；烟向上翻卷；维持时暖光贴着身体明灭上浮。
 * 数：火星量绑 `data.sparks`（攻防派生），气环拍数绑 `data.pulses`（等级派生），尺寸与范围绑 `data.scale`（体型派生）。
 * 持续状态：维持期低密度、贴身与脚边，玩家仍看得清目标。
 */
const BulkUpDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        brace: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "brace_ember", bind: "source", fit: "none", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 12, shape: { kind: "sphere", radius: 1.4 },
                    direction: "inward", speed: [0.03, 0.1], drag: 0.9, spin: 14,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xF2A25A, alpha: [0.5, 0], light: "full", bloom: 0.3, maxParticles: 36
                }
            ]
        },
        swell: {
            duration: 34,
            exit: { stop: 14, drain: 20 },
            emitters: [
                {
                    name: "swell_ember", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "sparks", fallback: 22 }, interval: 4, repeats: 2 },
                    shape: { kind: "sphere", radius: 1.4 },
                    direction: "outward", speed: [0.05, 0.2], gravity: -0.004, drag: 0.9, spin: 22,
                    lifetime: [10, 20], size: [0.14, 0.03],
                    color: 0xF2A25A, alpha: [0.85, 0], light: "full", bloom: 0.4, maxParticles: 200
                },
                {
                    name: "swell_ring", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: { data: "pulses", fallback: 2 }, interval: 5 },
                    shape: { kind: "ring", radius: 1.4 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [14, 22], size: [0.5, 0.85], sizeMode: "index",
                    color: 0xE0603C, alpha: [0.6, 0], light: "world", maxParticles: 40
                },
                {
                    name: "swell_smoke", bind: "source", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    burst: { count: 10 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "up", speed: [0.02, 0.08], drag: 0.92,
                    lifetime: [16, 28], size: [0.3, 0.6],
                    color: 0x8A3B28, alpha: [0.25, 0], light: "world", maxParticles: 40
                }
            ]
        },
        aura: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "aura_boost", bind: "source", fit: "none", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 3, shape: { kind: "sphere", radius: 0.5 },
                    direction: "up", speed: [0.012, 0.028], spin: 12,
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xF2A25A, alpha: [0.32, 0], light: "full", bloom: 0.3, maxParticles: 18
                },
                {
                    name: "aura_ember", bind: "source", fit: "none", height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 3, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.008, 0.022], gravity: -0.001,
                    lifetime: [12, 20], size: [0.06, 0.01],
                    color: 0xE0603C, alpha: [0.3, 0], light: "world", maxParticles: 16
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
