/**
 * 水流环 / Aqua Ring 的粒子语言。
 *
 * 一句话：脚下涌起一圈水，水幕顺着身体合拢（gather→veil）→ 之后每隔一会儿，脚下炸开一环水花、身上浮起水光（pulse）→
 *   水幕走完或被清除时，水滴慢慢落回地面散去（fade）。
 * 色相家族：水青 0x4FC3E8 为主体，泡沫白 0xE8FBFF 做高光，深水蓝 0x1C6E8C 只做环底。
 * 拍子：起 gather 0–14t ／ 持 veil ／ 涌 pulse 0–22t（每 interval 一次）／ 收 fade 0–24t。
 * 范围：veil 与 pulse 的环半径随 `data.scale`（服务端按水幕半径算出的倍率）缩放，环画到哪水幕就到哪。
 * 运动：水花自脚下向外炸、水光沿身体向上浮、水幕层缓缓旋转。
 * 数：水光点数绑 `data.motes`（特防派生），涌起的强度随 `data.healed`（这一口的实回量）变化。
 */
const AquaRingDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "swirl_in", bind: "source", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 12, interval: 4, repeats: 2 }, shape: { kind: "ring", radius: 1.6 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.2, 0.05], sizeMode: "index",
                    color: 0x4FC3E8, alpha: [0.7, 0], light: "world", maxParticles: 34
                },
                {
                    name: "updraft", bind: "source", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 14, shape: { kind: "circle", radius: 0.4 },
                    direction: "up", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.1, 0.01],
                    color: 0xE8FBFF, alpha: [0.6, 0], light: "world", maxParticles: 28
                }
            ]
        },
        veil: {
            exit: { drain: 20 },
            emitters: [
                {
                    name: "curtain", bind: "target", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 8, shape: { kind: "cylinder", radius: 0.5, length: 1.1 },
                    direction: "up", speed: [0.006, 0.03], spin: 6,
                    lifetime: [16, 28], size: [0.16, 0.03],
                    color: 0x4FC3E8, alpha: [0.4, 0], alphaMode: "sin", light: "world", maxParticles: 26
                },
                {
                    name: "floor", bind: "target", offset: [0, 0.04, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    rate: 3, shape: { kind: "circle", radius: 1.6, thickness: 0.8 },
                    direction: "up", speed: [0.004, 0.014],
                    lifetime: [18, 30], size: [0.14, 0.04],
                    color: 0x1C6E8C, alpha: [0.28, 0.02], alphaMode: "sin", light: "world", maxParticles: 18
                },
                {
                    name: "beads", bind: "target", offset: [0, 0.4, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 4, shape: { kind: "sphere_surface", radius: 0.42 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [14, 24], size: [0.09, 0.02], sizeMode: "sin",
                    color: 0xE8FBFF, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        },
        pulse: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "splash", bind: "target", offset: [0, 0.06, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: 2, interval: 3 }, shape: { kind: "ring", radius: 1.6 },
                    direction: "outward", speed: [0.06, 0.16],
                    lifetime: [8, 14], size: [0.2, 0.5], sizeMode: "index",
                    color: 0x4FC3E8, alpha: [0.8, 0], light: "world", maxParticles: 30
                },
                {
                    name: "sparkle", bind: "target", offset: [0, 0.45, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 14 } }, shape: { kind: "sphere_surface", radius: 0.44 },
                    direction: "outward", speed: [0.05, 0.14], drag: 0.9,
                    lifetime: [8, 15], size: [0.09, 0.01],
                    color: 0xE8FBFF, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 40
                },
                {
                    name: "up_orb", bind: "target", offset: [0, 0.15, 0], height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: { data: "motes", fallback: 14 }, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.5 },
                    direction: "up", speed: [0.04, 0.12],
                    lifetime: [10, 18], size: [0.08, 0.01], sizeMode: "sin",
                    color: 0x4FC3E8, alpha: [0.8, 0], light: "full", maxParticles: 48
                }
            ]
        },
        fade: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "drip", bind: "target", offset: [0, 0.5, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/orb/mediumfadeorb",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.42 },
                    direction: "down", speed: [0.03, 0.1], gravity: 0.03, drag: 0.94,
                    lifetime: [14, 24], size: [0.12, 0.02],
                    color: 0x4FC3E8, alpha: [0.45, 0], light: "world", maxParticles: 28
                },
                {
                    name: "last_ring", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 2 }, shape: { kind: "ring", radius: 1.6 },
                    direction: "outward", speed: [0.02, 0.06],
                    lifetime: [14, 24], size: [0.3, 0.7], sizeMode: "sin",
                    color: 0x1C6E8C, alpha: [0.3, 0], light: "world", maxParticles: 12
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_aquaring", 1, AquaRingDefinition);
