/**
 * 恶梦 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者掌心聚起一团黑紫的影 → 一条影线把施术者与熟睡目标连起来、在睡者身上烙下一圈梦印 →
 *   随后黑影持续压低、梦印随倒数向内收缩 → 倒数走完的一瞬碎开、抽走一缕发暗的生命，睡者也随之醒来、黑影被切断；
 *   若在倒数中被提前唤醒／驱散，黑影只自行消散退去。
 *
 * 色相家族：暗紫（0x4B2A6B）为主体与梦印，近黑紫（0x241535）只压核心与压下的影，灰紫（0xC9B8E8）只给抽离的命缕高光；单一色相。
 * 拍子：起 windup（掌心聚影）→ 印 seal（影线相连）→ 咒 curse（梦印烙下）→ 候 countdown（黑影压低压密、梦印收缩）→
 *   收 harvest（一次碎开抽命）→ 醒 wake（醒来断影）／散 fade（睡中消散）。
 * 范围：seal 沿 `data.path`（自身与目标两个真实顶点）画一条连接影线，表示诅咒落点，不做沿线飞行；curse 的梦印半径由 `data.scale` 随 sealRadius 放大。
 * 运动：countdown 的黑影自目标上方持续压下、梦印半径由 `data.ring`（随实际倒数收缩）驱动向内收；harvest 的黑影在收割点一次碎开，抽离的命缕向上飘散。
 * 数：`data.shades`（特攻换算）决定黑影层数与连接影线密度；`data.progress`（倒数进度）与 `data.ring` 驱动压低与收缩；
 *   `data.intensity`（本次实际扣血占最大生命的比例换算）决定 harvest 各发射器的密度与亮度。
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
                    shape: { kind: "polyline" }, rate: { data: "shades", fallback: 16 },
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
        // 倒数：黑影持续压低、梦印按 data.ring（随剩余刻数收缩）向内收，越接近收割越密。
        countdown: {
            duration: 0,
            exit: { stop: 0, drain: 8 },
            emitters: [
                {
                    name: "press", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: { data: "intensity", fallback: 1 }, shape: { kind: "cylinder", radius: 0.34, length: 0.9 },
                    direction: "down", speed: [0.02, 0.1], drag: 0.9,
                    lifetime: [8, 15], size: [0.22, 0.4],
                    color: 0x241535, alpha: [0.32, 0], light: "world", maxParticles: 60
                },
                {
                    name: "squeeze", bind: "target", offset: [0, 0.08, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/largering",
                    rate: 4, shape: { kind: "ring", radius: { data: "ring", fallback: 1.5 }, rotation: [90, 0, 0] },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 16], size: [0.26, 0.4],
                    color: 0x4B2A6B, alpha: [0.4, 0], light: "world", maxParticles: 24
                },
                {
                    name: "sift", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: { data: "shades", fallback: 10 }, shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [10, 16], size: [0.08, 0.02],
                    color: 0xC9B8E8, alpha: [0.4, 0], light: "full", bloom: 0.2, maxParticles: 30
                }
            ]
        },
        // 收割：一次碎开——暗影在命中点炸开、命缕上抽、梦印环碎裂，没有持续跳数。
        harvest: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "shatter", bind: "target", height: 0.55,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.06, 0.22],
                    lifetime: [6, 12], size: [0.3, 0.05], sizeMode: "index",
                    color: 0x4B2A6B, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 32
                },
                {
                    name: "life", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: { data: "shades", fallback: 10 } }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xC9B8E8, alpha: [0.75, 0], light: "full", bloom: 0.25, maxParticles: 48
                },
                {
                    name: "break_ring", bind: "target", offset: [0, 0.12, 0],
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 20 }, shape: { kind: "ring", radius: 0.34, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [7, 13], size: [0.24, 0.06],
                    color: 0x241535, alpha: [0.7, 0], light: "world", maxParticles: 28
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
        // 睡者仍睡着、倒数被提前打断／驱散：黑影只是缓缓升散，不播「醒来」的 Z。
        fade: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "dissolve", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/orb/largesmokeorb",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.02, 0.1], drag: 0.92,
                    lifetime: [12, 20], size: [0.24, 0.38],
                    color: 0x241535, alpha: [0.3, 0], light: "world", maxParticles: 30
                },
                {
                    name: "motes", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 10 }, shape: { kind: "sphere", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.05],
                    lifetime: [10, 18], size: [0.08, 0.02],
                    color: 0xC9B8E8, alpha: [0.35, 0], light: "full", maxParticles: 18
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
