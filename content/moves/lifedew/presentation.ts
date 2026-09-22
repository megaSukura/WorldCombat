/**
 * 生命水滴 / Life Dew 的粒子语言。
 *
 * 一句话：水从施法者脚下涌起，一圈水环贴着地面越铺越开、扫过站在圈里的自己与伙伴；每扫到一个人，
 *   那人身上溅起一捧水花并亮起治疗的光，水环走到头就一起退去。
 * 色相家族：水青 0x4FC3E8 作主体，近白的 0xDCF6FF 作浪尖与治疗光，只在治疗层出现一点点亮青。
 * 拍子：起（gather 拢水）／涌（burst 起波）／铺（spread 水环推进）／溅（splash 命中治疗）／收（settle 退水）。
 * 范围：burst / spread / settle 的水环绑脚点、`fit:"none"`，形状按参考半径 3.0 书写、由 `data.scale`
 *   （实际水波半径 / 3.0）推出真实大小——画面里的环就是会被扫到的范围。
 * 运动：水环沿地面由内向外推，速度由 `data.progress` 与每帧更新的 `data.scale` 表达；水滴向外飞溅后落回。
 * 数：水环与水滴的发射量绑 `data.motes`（特攻＋身高派生），命中层按 `data.share`（实际回复比例）再加密。
 */
const LifeDewDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        gather: {
            duration: 14,
            exit: { stop: 5, drain: 12 },
            emitters: [
                {
                    name: "hand_water", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    rate: { data: "motes", fallback: 20 }, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0x8FE0F5, alpha: [0.65, 0], light: "full", maxParticles: 50
                },
                {
                    name: "hand_glow", bind: "source", offset: [0, 0.6, 0], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 10, shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0xDCF6FF, alpha: [0.8, 0], light: "full", bloom: 0.2, maxParticles: 40
                }
            ]
        },
        burst: {
            duration: 20,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "open_ring", bind: "point", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 3 }, shape: { kind: "circle", radius: 3.0, thickness: 0.9 },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 22], size: [0.3, 0.12], sizeMode: "index",
                    color: 0x9FE8FF, alpha: [0.75, 0], light: "full", bloom: 0.15, maxParticles: 40
                },
                {
                    name: "splash_out", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "motes", fallback: 20 } }, shape: { kind: "circle", radius: 3.0, thickness: 0.5 },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.03, drag: 0.94,
                    lifetime: [10, 18], size: [0.11, 0.02],
                    color: 0x6FD3EC, alpha: [0.8, 0], light: "full", maxParticles: 120
                }
            ]
        },
        spread: {
            duration: 30,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "wave", bind: "point", offset: [0, 0.07, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 26, shape: { kind: "circle", radius: 3.0, thickness: 0.85 },
                    direction: "outward", speed: [0.04, 0.14],
                    lifetime: [10, 18], size: [0.26, 0.1], sizeMode: "index",
                    color: 0x9FE8FF, alpha: [0.6, 0], light: "full", bloom: 0.12, maxParticles: 120
                },
                {
                    name: "crest", bind: "point", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/water/fishsplash",
                    rate: { data: "motes", fallback: 20 }, shape: { kind: "circle", radius: 3.0, thickness: 0.9 },
                    direction: "outward", speed: [0.06, 0.2], gravity: 0.025, drag: 0.94,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x8FE0F5, alpha: [0.7, 0], light: "full", maxParticles: 160
                }
            ]
        },
        splash: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "spray", bind: "target", offset: [0, 0.45, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/water/rainsplash",
                    burst: { count: { data: "motes", fallback: 16 } }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.06, 0.24], gravity: 0.03, drag: 0.93,
                    lifetime: [8, 16], size: [0.11, 0.02],
                    color: 0x8FE0F5, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "heal_light", bind: "target", offset: [0, 0.55, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    burst: { count: { data: "motes", fallback: 12 }, interval: 3, repeats: 2 }, shape: { kind: "sphere", radius: 0.45 },
                    direction: "up", speed: [0.03, 0.12], drag: 0.92,
                    lifetime: [10, 20], size: [0.08, 0.01],
                    color: 0xDCF6FF, alpha: [0.95, 0], light: "full", bloom: 0.28, maxParticles: 60
                },
                {
                    name: "drip", bind: "target", offset: [0, 0.3, 0], height: 0.3,
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    burst: { count: { data: "motes", fallback: 8 }, at: 2 }, shape: { kind: "sphere", radius: 0.35 },
                    direction: "down", speed: [0.02, 0.1], gravity: 0.02,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xBFEEFF, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        settle: {
            duration: 28,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "recede", bind: "point", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    rate: 14, shape: { kind: "circle", radius: 3.0, thickness: 0.9 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [12, 22], size: [0.22, 0.04], sizeMode: "index",
                    color: 0x8FE0F5, alpha: [0.4, 0], light: "full", maxParticles: 60
                },
                {
                    name: "mist", bind: "point", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/smallbubble",
                    rate: 10, shape: { kind: "circle", radius: 3.0 },
                    direction: "up", speed: [0.01, 0.05], drag: 0.95,
                    lifetime: [14, 26], size: [0.08, 0.01],
                    color: 0xDCF6FF, alpha: [0.35, 0], light: "world", maxParticles: 60
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_lifedew", 1, LifeDewDefinition);
