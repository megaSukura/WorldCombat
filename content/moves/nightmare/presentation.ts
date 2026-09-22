/**
 * 恶梦 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者掌心聚起一团黑紫的影 → 一道影烟沿通视直线压到熟睡目标的身上、在那里烙下一圈梦印 →
 *   此后每隔一段，它身下涌起一层层黑影、抽走一缕发暗的生命，人却醒不过来 → 梦散时黑影向上炸开、退去。
 *
 * 色相家族：暗紫（0x4B2A6B）为主体与梦印，近黑紫（0x241535）只压核心与涌起的影，灰紫（0xC9B8E8）只给抽离的命缕高光；单一色相。
 * 拍子：起 windup（掌心聚影）→ 印 seal（影烟过线）→ 咒 curse（梦印烙下）→ 跳 pulse（层层黑影＋抽命）→ 醒 wake（影散）。
 * 范围：seal 沿 `data.path`（自身与目标两个真实顶点）连线；curse 的梦印半径由 `data.scale` 随 sealRadius 放大。
 * 运动：pulse 的黑影自目标脚下向上涌起再收束，抽离的命缕向上飘散；wake 的黑影向外炸开。
 * 数：`data.shades`（特攻换算）决定黑影层数与密度，`data.left`（剩余跳数）与 `data.loss`（本跳实际扣血）决定单跳的强度与亮度。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const NightmareDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", height: 0.78,
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    rate: 8, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07], spin: 20,
                    lifetime: [8, 15], size: [0.2, 0.05],
                    color: 0x241535, alpha: [0.55, 0], light: "world", maxParticles: 24
                },
                {
                    name: "ember", bind: "source", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/xsfadeorblite",
                    rate: 6, shape: { kind: "circle", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xC9B8E8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 18
                }
            ]
        },
        seal: {
            duration: 26,
            exit: { stop: 12, drain: 16 },
            emitters: [
                {
                    name: "thread", bind: "path",
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    shape: { kind: "polyline" }, rate: 16,
                    direction: "shape", speed: [0.02, 0.08], spread: 14, spin: 12,
                    lifetime: [10, 16], size: [0.24, 0.4],
                    color: 0x241535, alpha: [0.4, 0], light: "world", maxParticles: 70
                },
                {
                    name: "front", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 8, shape: { kind: "circle", radius: 0.3 },
                    direction: "inward", speed: [0.03, 0.1],
                    lifetime: [10, 16], size: [0.22, 0.06],
                    color: 0x4B2A6B, alpha: [0.6, 0], light: "world", maxParticles: 30
                }
            ]
        },
        curse: {
            duration: 30,
            exit: { stop: 13, drain: 20 },
            emitters: [
                {
                    name: "brand", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    burst: { count: 34 }, shape: { kind: "ring", radius: 0.42 },
                    direction: "inward", speed: [0.04, 0.1],
                    lifetime: [12, 20], size: [0.3, 0.14],
                    color: 0x4B2A6B, alpha: [0.6, 0], light: "full", maxParticles: 48
                },
                {
                    name: "well", bind: "target", height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ghost",
                    burst: { count: { data: "shades", fallback: 12 } }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "down", speed: [0.02, 0.1],
                    lifetime: [8, 14], size: [0.28, 0.06], sizeMode: "index",
                    color: 0x241535, alpha: [0.85, 0], light: "world", maxParticles: 36
                }
            ]
        },
        pulse: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "surge", bind: "target", height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    burst: { count: { data: "shades", fallback: 10 } }, shape: { kind: "cylinder", radius: 0.34, length: 1.0 },
                    direction: "up", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.24, 0.44],
                    color: 0x241535, alpha: [0.35, 0], light: "world", maxParticles: 60
                },
                {
                    name: "drain_flecks", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "shades", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.04, 0.14],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xC9B8E8, alpha: [0.7, 0], light: "full", bloom: 0.25, maxParticles: 48
                },
                {
                    name: "bite", bind: "target", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [6, 12], size: [0.26, 0.04], sizeMode: "index",
                    color: 0x4B2A6B, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 28
                }
            ]
        },
        wake: {
            duration: 24,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "lift", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    burst: { count: 22 }, shape: { kind: "sphere", radius: 0.32 },
                    direction: "outward", speed: [0.05, 0.2], drag: 0.9,
                    lifetime: [12, 20], size: [0.26, 0.4],
                    color: 0x241535, alpha: [0.4, 0], light: "world", maxParticles: 40
                },
                {
                    name: "dawn", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/status/sleep_zzz",
                    burst: { count: 10 }, shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.18, 0.05],
                    color: 0xC9B8E8, alpha: [0.6, 0], light: "full", maxParticles: 24
                }
            ]
        },
        immune: {
            duration: 18,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "shrug", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.32 },
                    direction: "outward", speed: [0.04, 0.1],
                    lifetime: [8, 14], size: [0.22, 0.06],
                    color: 0xC9B8E8, alpha: [0.5, 0], light: "full", maxParticles: 20
                }
            ]
        },
        fizzle: {
            duration: 16,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "gone", bind: "point", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/smoke/smoke",
                    burst: { count: 8 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 16], size: [0.16, 0.28],
                    color: 0x241535, alpha: [0.2, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_nightmare", 1, NightmareDefinition);
