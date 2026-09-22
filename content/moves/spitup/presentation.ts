/**
 * 喷出 / spitup 的客户端表现。
 *
 * 一句话：压缩的琥珀光点一层层被推上喉咙（层数越多越亮越密），随后沿瞄准方向喷出一发实心弹／一整片锥形，
 *   命中处炸开琥珀色的碎光。
 * 色相家族：琥珀金（0xF0B23A）主体，暖白（0xFFF3C4）强调，深褐（0x8A5A22）余韵；与「蓄力」同一色相，读得出这一口
 *   吐的就是攒下的那些力。
 * 拍子：起 gather（聚气）→ 出 spit／spray（喷出）→ 击 burst（命中爆开）→ 空 whiff。
 * 范围：spray 的锥形用 `data.path`（与服务端 `WorldGeometry.sector` 同一组顶点）填成一整片扇面，画出的就是会喷到的地；
 *   直喷式的命中范围由 `data.scale`（判定半径 / 0.22）画出的爆环表达。
 * 运动：聚气时琥珀点由外向内收；spit 沿 `data.direction` 向前喷出；spray 沿线铺开；命中碎光沿球面外抛带重力。
 * 数：`data.layers`（蓄力层数）决定聚气点量与弹体大小，`data.motes`（层数与特攻派生）决定碎光量，
 *   `data.intensity`（本口威力 / 120）抬高亮度，`data.reach`／`data.degrees` 只用于扇面几何。
 * 参照节：视觉语言第二、三、四、七、九节。
 */
const SpitupDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 12,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "pull", bind: "source", offset: [0, 0, 0], height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 18, shape: { kind: "sphere", radius: 0.7 },
                    direction: "inward", speed: [0.04, 0.16], drag: 0.9, spin: 12,
                    lifetime: [7, 13], size: [0.1, 0.02],
                    color: 0xFFF3C4, alpha: [0.55, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "core", bind: "source", offset: [0, 0, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    rate: 8, shape: { kind: "sphere", radius: 0.26 },
                    direction: "inward", speed: [0.01, 0.05], spin: 14,
                    lifetime: [9, 16], size: { data: "layers", fallback: 1 },
                    color: 0xF0B23A, alpha: [0.75, 0], light: "full", bloom: 0.35, maxParticles: 22
                }
            ]
        },
        spit: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "muzzle", bind: "source", offset: [0, 0, 0], height: 0.6, fit: "body", orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/speedlines",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "cone", radius: 0.32, angleDegrees: 26 },
                    direction: "shape", speed: [0.12, 0.42],
                    lifetime: [4, 9], size: [0.22, 0.05],
                    color: 0xFFF3C4, alpha: [0.7, 0], light: "full", maxParticles: 90
                },
                {
                    name: "flare", bind: "source", offset: [0, 0, 0], height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/largefadeorb",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: 0.24 },
                    direction: "shape", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: { data: "scale", fallback: 1 },
                    color: 0xF0B23A, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 22
                }
            ]
        },
        spray: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "fan", bind: "path", fit: "none", offset: [0, 0.35, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: 70, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.03, 0.12], drag: 0.94,
                    lifetime: [12, 22], size: [0.4, 0.1],
                    color: 0xF0B23A, alpha: [0.3, 0], light: "world", maxParticles: 220
                },
                {
                    name: "fan_mote", bind: "path", fit: "none", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 40, shape: { kind: "polygon" },
                    direction: "shape", speed: [0.05, 0.2], gravity: 0.01, drag: 0.94,
                    lifetime: [8, 16], size: [0.09, 0.02],
                    color: 0xFFF3C4, alpha: [0.6, 0], light: "full", bloom: 0.25, maxParticles: 160
                }
            ]
        },
        burst: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "hit", bind: "target", fit: "body", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_normal",
                    burst: { count: 16, at: 1 },
                    shape: { kind: "sphere", radius: 0.38 },
                    direction: "shape", speed: [0.06, 0.24],
                    lifetime: [6, 11], size: [0.42, 0.06], sizeMode: "index",
                    color: 0xFFF3C4, alpha: [1, 0], light: "full", bloom: 0.45, maxParticles: 54
                },
                {
                    name: "shards", bind: "target", fit: "body", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.44 },
                    direction: "outward", speed: [0.06, 0.26], gravity: 0.02, drag: 0.92, spin: 16,
                    lifetime: [9, 18], size: [0.1, 0.02],
                    color: 0xF0B23A, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 130
                },
                {
                    name: "dust", bind: "target", fit: "body", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [12, 20], size: [0.06, 0.02],
                    color: 0x8A5A22, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        whiff: {
            duration: 18,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "fade", bind: "point", offset: [0, 0.5, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 10 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.02, 0.1], gravity: 0.03, drag: 0.92,
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0x8A5A22, alpha: [0.45, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_spitup", 1, SpitupDefinition);
