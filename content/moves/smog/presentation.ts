/**
 * 浊雾 / smog 的客户端表现。
 *
 * 一句话：施法者吸一口气、口边聚起黄绿雾团，朝正前方吐出一道低矮的浊雾；雾贴着地面向前滚，
 *   先漫过近处、隔一拍再涌到锥尖，卷过的人和地都被熏成雾色，被熏到的人身上冒起毒紫泡。
 * 色相家族：浊黄绿与灰（smoke / obscuringsmoke / big_smoke / ooze）为主体，毒紫（poisonbubble）只出现在中毒的人身上。
 * 拍子：起（inhale 聚雾）→ 喷（puff 口边喷出、wash 雾锥向前滚）→ 涌（crest 远段涌到、hit 命中、poison 中毒）。
 * 范围：wash / crest 的雾锥按服务端传的 `data.reach`（真实射程）与 `data.half`（判定半角）画出，锥面就是会被熏到的地。
 * 运动：雾团沿锥面从施法者向外滚（`direction: "shape"` 从锥尖散开），远段按 `data.wave` 的节拍涌到。
 * 数：`data.puffs`（特攻派生）决定雾的密度，`data.intensity`（威力派生）决定命中的亮度。
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
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gust", bind: "source", offset: [0, 0.5, 0.5], height: 0.5,
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    burst: { count: { data: "puffs", fallback: 14 }, at: 1 },
                    shape: { kind: "cone", radius: 1.1, angleDegrees: { data: "half", fallback: 17 } },
                    direction: "shape", speed: [0.08, 0.3], spread: 16,
                    lifetime: [10, 20], size: [0.4, 0.08], sizeMode: "index",
                    color: 0x8FBF4A, alpha: [0.7, 0], light: "world", maxParticles: 60
                }
            ]
        },
        wash: {
            duration: 30,
            exit: { stop: 20, drain: 16 },
            emitters: [
                {
                    name: "haze", bind: "point", offset: [0, 0.35, 0], height: 0, fit: "none",
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    rate: { data: "puffs", fallback: 14 },
                    shape: { kind: "cone", radius: { data: "reach", fallback: 6 }, angleDegrees: { data: "half", fallback: 17 } },
                    direction: "shape", speed: [0.04, 0.16], spread: 20,
                    drag: 0.9,
                    lifetime: [16, 30], size: [0.44, 0.06],
                    color: 0x8FBF4A, alpha: [0.4, 0], light: "world", maxParticles: 130
                },
                {
                    name: "low", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "puffs", fallback: 14 },
                    shape: { kind: "cone", radius: { data: "reach", fallback: 6 }, angleDegrees: { data: "half", fallback: 17 } },
                    direction: "shape", speed: [0.03, 0.12], spread: 22,
                    drag: 0.92,
                    lifetime: [18, 34], size: [0.5, 0.08],
                    color: 0x6E8C3A, alpha: [0.35, 0], light: "world", maxParticles: 110
                },
                {
                    name: "front", bind: "point", offset: [0, 1.1, 0], height: 0, fit: "none",
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/generic/bubble/poisonbubble",
                    rate: 16, start: { data: "wave", fallback: 5 },
                    shape: { kind: "cone", radius: { data: "reach", fallback: 6 }, angleDegrees: { data: "half", fallback: 17 } },
                    direction: "shape", speed: [0.05, 0.2], spread: 18,
                    lifetime: [12, 24], size: [0.12, 0.02],
                    color: 0xA879D0, alpha: [0.5, 0], light: "full", maxParticles: 80
                }
            ]
        },
        crest: {
            duration: 20,
            exit: { stop: 9, drain: 14 },
            emitters: [
                {
                    name: "surge", bind: "point", offset: [0, 0.4, 0], height: 0, fit: "none",
                    orient: "direction",
                    particle: "world_combat_core:cobblemon/vanilla/big_smoke",
                    burst: { count: { data: "puffs", fallback: 14 }, at: 1 },
                    shape: { kind: "cone", radius: { data: "reach", fallback: 6 }, angleDegrees: { data: "half", fallback: 17 } },
                    direction: "shape", speed: [0.07, 0.26], spread: 18,
                    lifetime: [12, 24], size: [0.5, 0.08], sizeMode: "index",
                    color: 0x8FBF4A, alpha: [0.6, 0], light: "world", maxParticles: 70
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
