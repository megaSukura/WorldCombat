/**
 * 陷阱甲壳 / shelltrap 的客户端表现。
 *
 * 一句话：施法者把壳合拢、张成一只在地上发烫的甲壳陷阱——壳面爬着橙红的引线热光、脚下一圈焦痕；
 *   被一记物理点着时，整只壳朝外炸成火球与碎片；一直没被点着，热光就慢慢冷下来、只留一缕烟。
 * 色相家族：火橙（0xE07030 / fire/flame / ember）与焦褐（0x6A5040 / smoke），近白只给爆炸核心。
 * 拍子：起（charge 引线聚光）→ 撑（arm 合壳 / hold 待爆）→ 爆（detonate 火球 + detonate_hit 逐处）→ 收（fizzle 冷壳）。
 * 范围：arm／hold／detonate 的地面焦痕与环按服务端传的 `data.radius` / `data.scale` 画出——
 *   画出的那圈就是会被炸到的地。
 * 运动：charge 火星向内收；arm 壳片合拢；hold 壳面热光明灭、边缘冒小火星；detonate 火与外压整圈炸开、碎片飞出；
 *   fizzle 热光褪去、一缕烟上升。
 * 数：`data.sparks`（威力与半径派生）决定待爆时的火星量与爆炸碎片量，`data.hits`（本次命中数）决定爆炸的强度，
 *   `data.remaining`／`data.window` 决定待爆热光的明暗。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const ShelltrapDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "fuse", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: 20, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.05, 0.18], spread: 16,
                    lifetime: [7, 13], size: [0.1, 0.02], sizeMode: "sin",
                    color: 0xE07030, alpha: [0.85, 0], light: "full", bloom: 0.45, maxParticles: 46
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 8, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.1],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFD25A, alpha: [0.8, 0], light: "full", maxParticles: 22
                }
            ]
        },
        arm: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "shell", bind: "source", offset: [0, 0.4, 0], height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/moves/withdraw",
                    burst: { count: { data: "sparks", fallback: 24 }, at: 0 }, amount: 1,
                    shape: { kind: "sphere_surface", radius: 0.6 },
                    direction: "inward", speed: [0.08, 0.24],
                    lifetime: [9, 16], size: [0.26, 0.05],
                    color: 0xB85A38, alpha: [0.75, 0], light: "world", maxParticles: 90
                },
                {
                    name: "seam", bind: "source", offset: [0, 0.25, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 2 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.4, 0.8], sizeMode: "linear",
                    color: 0xE07030, alpha: [0.6, 0], light: "full", bloom: 0.3, maxParticles: 18
                }
            ]
        },
        hold: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "scorch", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/scorch/floorscorch",
                    burst: { count: 1, at: 0 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.0, 0.02],
                    lifetime: [14, 22], size: [0.9, 1.4], sizeMode: "linear",
                    color: 0x8A4020, alpha: [0.5, 0], light: "world", maxParticles: 8
                },
                {
                    name: "heat", bind: "point", offset: [0, 0.2, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    rate: { data: "sparks", fallback: 24 }, shape: { kind: "circle", radius: { data: "scale", fallback: 1 }, thickness: 0.6 },
                    direction: "up", speed: [0.01, 0.06], gravity: -0.01,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xE07030, alpha: [0.35, 0], light: "full", maxParticles: 90
                }
            ]
        },
        detonate: {
            duration: 34,
            exit: { stop: 12, drain: 22 },
            emitters: [
                {
                    name: "fire", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: { data: "sparks", fallback: 30 }, interval: 1, repeats: 3 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.14, 0.5], spread: 30,
                    lifetime: [7, 14], size: [0.4, 0.1], sizeMode: "index",
                    color: 0xE07030, alpha: [0.9, 0], light: "full", bloom: 0.5, maxParticles: 260
                },
                {
                    name: "blast", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/vanilla/small_explosion",
                    burst: { count: 3, at: 0 }, amount: 1,
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [7, 13], size: [0.9, 0.4], sizeMode: "index",
                    color: 0xFFE0B0, alpha: [0.95, 0], light: "full", bloom: 0.6, maxParticles: 24
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.15, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/giantring_white",
                    burst: { count: 2, at: 0 }, shape: { kind: "ring", radius: { data: "scale", fallback: 1 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.2, 0.5], spread: 8,
                    lifetime: [10, 16], size: [0.6, 1.4], sizeMode: "linear",
                    color: 0xFFD8A0, alpha: [0.7, 0], light: "full", bloom: 0.4, maxParticles: 40
                },
                {
                    name: "smoke", bind: "point", offset: [0, 0.6, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "sparks", fallback: 30 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "up", speed: [0.03, 0.12], gravity: -0.02, drag: 0.9,
                    lifetime: [16, 28], size: [0.5, 0.2],
                    color: 0x6A5040, alpha: [0.35, 0], light: "world", maxParticles: 120
                }
            ]
        },
        "detonate_hit": {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: { data: "sparks", fallback: 20 } }, amount: 1,
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.12, 0.42], spread: 24,
                    lifetime: [6, 12], size: [0.42, 0.07], sizeMode: "index",
                    color: 0xFFD8A0, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 90
                },
                {
                    name: "ember", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fire/ember",
                    burst: { count: { data: "sparks", fallback: 16 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.18, 0.5], spread: 26, gravity: 0.02,
                    lifetime: [9, 16], size: [0.09, 0.01],
                    color: 0xE07030, alpha: [0.85, 0], light: "full", maxParticles: 70
                }
            ]
        },
        burn: {
            duration: 24,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "catch", bind: "target", height: 0.45, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/fire/flame",
                    burst: { count: 8, interval: 2, repeats: 3 },
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "up", speed: [0.04, 0.16], gravity: -0.01, drag: 0.92,
                    lifetime: [10, 18], size: [0.16, 0.02],
                    color: 0xE07030, alpha: [0.8, 0], light: "full", bloom: 0.4, maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "cool", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.5 },
                    direction: "up", speed: [0.02, 0.08], gravity: -0.01, drag: 0.9,
                    lifetime: [14, 24], size: [0.3, 0.14],
                    color: 0x6A5040, alpha: [0.35, 0], light: "world", maxParticles: 34
                },
                {
                    name: "wisp", bind: "source", offset: [0, 0.5, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/fire/wisp",
                    burst: { count: 6 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xE07030, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_shelltrap", 1, ShelltrapDefinition);
