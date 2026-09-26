/**
 * 浊雾 / smog 的客户端表现。
 *
 * 一句话：施法者吸一口气、口边聚起黄绿雾团，朝选定方向吐出一团浊雾；雾团离开口边后缓慢滚远、一路膨大，
 *   可见前缘持续翻滚、后缘不断消散，滚到尽头就变薄散去；被罩到的人身上冒起毒紫泡。
 * 色相家族：浊黄绿与灰（smoke / obscuringsmoke / big_smoke / ooze）为主体，毒紫（poisonbubble）只出现在中毒的人身上。
 * 拍子：起（inhale 聚雾）→ 吐（puff 口边爆开）→ 滚（roll 前缘移动、后缘消散）→ 碰墙（wall 堆薄）→ 散（fade）。
 * 范围：roll 的球半径由服务端传的 `data.scale`（实际半径 / 参考半径）撑开，画出的就是判定罩到的体积；
 *   前缘中心每刻由服务端更新，画面与判定读同一份位置与半径。
 * 运动：roll 以球面向外翻滚，后缘发射器沿 `data.back*` 反向漂移，自然落在队尾消散。
 * 数：`data.puffs`（特攻与体重派生）决定雾的密度，`data.intensity`（威力派生）决定命中的亮度。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const SmogDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        inhale: {
            duration: { data: "windup", fallback: 10 },
            exit: { drain: 12 },
            emitters: [
                {
                    name: "draw", bind: "source", offset: [0, 0.55, 0.35], height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "puffs", fallback: 14 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.03, 0.1], spread: 24,
                    lifetime: [8, 16], size: [0.22, 0.05],
                    color: 0x8FBF4A, alpha: [0.45, 0], light: "world", maxParticles: 30
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.6, 0.4], height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 6, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.06],
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0xA879D0, alpha: [0.55, 0], light: "full", maxParticles: 16
                }
            ]
        },
        puff: {
            duration: 18,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "mouth", bind: "point", fit: "none", offset: [0, 0.1, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    burst: { count: { data: "puffs", fallback: 14 }, at: 0 },
                    shape: { kind: "cone", radius: 1.0, angleDegrees: { data: "half", fallback: 17 } },
                    direction: "shape", speed: [0.08, 0.28], spread: 18,
                    lifetime: [8, 16], size: [0.32, 0.05],
                    color: 0x8FBF4A, alpha: [0.7, 0], light: "world", maxParticles: 52
                }
            ]
        },
        roll: {
            exit: { drain: 24 },
            emitters: [
                {
                    name: "core", bind: "point", fit: "none", offset: [0, 0.22, 0],
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    rate: { data: "puffs", fallback: 14 },
                    shape: { kind: "sphere", radius: 1.4, thickness: 0.7 },
                    direction: "outward", speed: [0.03, 0.13], spread: 22,
                    lifetime: [14, 26], size: [0.55, 0.1], sizeMode: "index",
                    color: 0x8FBF4A, alpha: [0.55, 0], light: "world", maxParticles: 120
                },
                {
                    name: "haze", bind: "point", fit: "none", offset: [0, 0.06, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "puffs", fallback: 14 },
                    shape: { kind: "sphere", radius: 1.5, thickness: 0.35 },
                    direction: "outward", speed: [0.02, 0.09], spread: 26,
                    drag: 0.92,
                    lifetime: [18, 34], size: [0.6, 0.08],
                    color: 0x6E8C3A, alpha: [0.32, 0], light: "world", maxParticles: 90
                },
                {
                    name: "front", bind: "point", fit: "none", offset: [0, 0.95, 0], orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 10, shape: { kind: "hemisphere", radius: 1.45, thickness: 0.2 },
                    direction: "outward", speed: [0.04, 0.15], spread: 20,
                    lifetime: [10, 20], size: [0.14, 0.02],
                    color: 0xA879D0, alpha: [0.5, 0], light: "full", maxParticles: 60
                },
                {
                    name: "wake", bind: "point", fit: "none",
                    offset: [{ data: "backX", fallback: 0 }, { data: "backY", fallback: 0 }, { data: "backZ", fallback: 0 }],
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "puffs", fallback: 14 },
                    shape: { kind: "sphere", radius: 1.1, thickness: 0.6 },
                    direction: "outward", speed: [0.02, 0.08], spread: 24,
                    drag: 0.86,
                    lifetime: [10, 20], size: [0.4, 0.04],
                    color: 0x5E7A34, alpha: [0.22, 0], light: "world", maxParticles: 70
                }
            ]
        },
        wall: {
            duration: 24,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "splat", bind: "point", fit: "none", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "puffs", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere", radius: 0.55 },
                    direction: "outward", speed: [0.02, 0.12], spread: 60, drag: 0.88,
                    lifetime: [10, 22], size: [0.4, 0.05],
                    color: 0x6E8C3A, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "beads", bind: "point", fit: "none", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.14], spread: 40,
                    lifetime: [8, 16], size: [0.1, 0.02],
                    color: 0xA879D0, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        fade: {
            duration: 26,
            exit: { stop: 9, drain: 18 },
            emitters: [
                {
                    name: "thin", bind: "point", fit: "none", offset: [0, 0.15, 0],
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    rate: { data: "puffs", fallback: 14 },
                    shape: { kind: "sphere", radius: 1.4, thickness: 0.5 },
                    direction: "outward", speed: [0.01, 0.05], spread: 30, drag: 0.9,
                    lifetime: [14, 26], size: [0.5, 0.03],
                    color: 0x8FBF4A, alpha: [0.32, 0], light: "world", maxParticles: 80
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "wave_puff", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_poison",
                    burst: { count: 8, at: 1 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.05, 0.2], spread: 22,
                    lifetime: [7, 14], size: [0.3, 0.05], sizeMode: "index",
                    color: 0xD8E8B0, alpha: [0.9, 0], light: "full", bloom: 0.25, maxParticles: 14
                },
                {
                    name: "coat", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: { data: "puffs", fallback: 14 }, at: 1 },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.18], spread: 22,
                    drag: 0.9,
                    lifetime: [10, 22], size: [0.24, 0.03],
                    color: 0x8FBF4A, alpha: [0.6, 0], light: "world", maxParticles: 40
                }
            ]
        },
        poison: {
            duration: 24,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "toxic", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 12, shape: { kind: "sphere", radius: 0.28 },
                    direction: "up", speed: [0.03, 0.11], spread: 16,
                    drag: 0.9,
                    lifetime: [12, 24], size: [0.14, 0.02],
                    color: 0xA879D0, alpha: [0.65, 0], light: "full", maxParticles: 36
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_smog", 1, SmogDefinition);
