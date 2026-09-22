/**
 * 预知未来 / futuresight 的客户端表现。
 *
 * 一句话：施法者眼里聚起紫蓝的念光，一团属于自己的念力漩涡在对手头顶成型并一路跟随，悬够时间后
 *   猛地砸下，在目标身上炸开一圈念力冲击。
 * 色相家族：紫蓝 0x8A7BFF 作主体、靛紫 0x4A3A9A 作阴影，冷白青 0xD8E8FF 只做星点与高光。
 * 拍子：起（windup 聚念／charge 放手）→ 悬（send 成型、hang 跟随）→ 落（dive 俯冲、impact 炸开）→ 收（fizzle 目标离场）。
 * 范围：impact 的地面圈半径绑服务端 data.radius（真实判定半径），玩家一眼看出落下罩住哪块地。
 * 运动：hang 的念力漩涡按 data.hang（悬停高度）挂在目标头顶并逐帧跟随；dive 从悬停高度落到目标。
 * 数：impact 的爆发量与亮度随 data.power（念力威力派生），悬停密度随 data.hang。
 */
const FuturesightDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 18,
            exit: { stop: 6, drain: 14 },
            emitters: [
                {
                    name: "eye_gather", bind: "source", offset: [0, 0.75, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/psychic/psyswirl",
                    rate: 18, shape: { kind: "sphere", radius: 0.28 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.22, 0.05],
                    color: 0x8A7BFF, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "eye_glint", bind: "source", offset: [0, 0.75, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 10, shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.09, 0.01],
                    color: 0xD8E8FF, alpha: [0.85, 0], light: "full", maxParticles: 26
                }
            ]
        },
        charge: {
            duration: 18,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "cast_burst", bind: "source", offset: [0, 0.7, 0], height: 0,
                    particle: "world_combat_core:cobblemon/moves/psychicsend",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.1, 0.3],
                    lifetime: [10, 18], size: [0.36, 0.08], sizeMode: "index",
                    color: 0x8A7BFF, alpha: [0.9, 0], light: "full", maxParticles: 30
                }
            ]
        },
        send: {
            duration: 26,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "mote_form", bind: "target", offset: [0, { data: "hang", fallback: 3 }, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    burst: { count: 18, interval: 2, repeats: 3 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [14, 24], size: [0.3, 0.06],
                    color: 0x8A7BFF, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "mote_ring", bind: "target", offset: [0, { data: "hang", fallback: 3 }, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 1 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [14, 22], size: [0.4, 0.8], sizeMode: "linear",
                    color: 0x4A3A9A, alpha: [0.7, 0], light: "full", maxParticles: 10
                }
            ]
        },
        hang: {
            exit: { drain: 22 },
            emitters: [
                {
                    name: "mote_core", bind: "target", offset: [0, { data: "hang", fallback: 3 }, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyspiral",
                    rate: 7, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.005, 0.02], spin: 3,
                    lifetime: [18, 30], size: [0.28, 0.06], alphaMode: "sin",
                    color: 0x8A7BFF, alpha: [0.85, 0.1], light: "full", bloom: 0.25, maxParticles: 16
                },
                {
                    name: "mote_glints", bind: "target", offset: [0, { data: "hang", fallback: 3 }, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 5, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "up", speed: [0.005, 0.02],
                    lifetime: [16, 28], size: [0.07, 0.01],
                    color: 0xD8E8FF, alpha: [0.7, 0], light: "full", maxParticles: 18
                }
            ]
        },
        dive: {
            duration: 16,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "dive_streak", bind: "source", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/moves/psychicsend",
                    burst: { count: 16, interval: 2, repeats: 3 }, shape: { kind: "ring", radius: 0.24 },
                    direction: "down", speed: [0.2, 0.5],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x8A7BFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 40
                }
            ]
        },
        impact: {
            duration: 32,
            exit: { stop: 10, drain: 22 },
            emitters: [
                {
                    name: "impact_burst", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/moves/psychichit",
                    burst: { count: { data: "motes", fallback: 28 } }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.4], spread: 22,
                    lifetime: [8, 16], size: [0.7, 0.1], sizeMode: "index",
                    color: 0xD8E8FF, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 80
                },
                {
                    name: "impact_ring", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/psychic/psyring2",
                    burst: { count: 2, interval: 4 }, shape: { kind: "ring", radius: { data: "radius", fallback: 0.6 } },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [14, 24], size: [0.6, 1.4], sizeMode: "linear",
                    color: 0x8A7BFF, alpha: [0.75, 0], light: "full", maxParticles: 24
                },
                {
                    name: "impact_mote", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/moves/psychichit_small",
                    burst: { count: { data: "motes", fallback: 22 }, interval: 2, repeats: 2 }, shape: { kind: "sphere_surface", radius: 0.44 },
                    direction: "outward", speed: [0.06, 0.24],
                    lifetime: [10, 20], size: [0.2, 0.03],
                    color: 0x4A3A9A, alpha: [0.7, 0], light: "full", maxParticles: 60
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "fizzle_mote", bind: "source", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.09],
                    lifetime: [12, 22], size: [0.08, 0.01],
                    color: 0x8A7BFF, alpha: [0.6, 0], light: "full", maxParticles: 26
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_futuresight", 1, FuturesightDefinition);
