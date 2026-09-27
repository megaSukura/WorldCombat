/**
 * 撒娇 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：起手时施法者抬眼前方亮起一小片心形扇；贴近时这片扇真的朝身前铺开，扇内每个被软到的身体
 *   各自炸开一圈心；改送飞吻时一个心形弹体沿直线飞出去，飞到人身上才炸，撞到墙或友方就碎在原地。
 *
 * 色相家族：暖玫瑰粉（0xF28FB0／0xE86F9E）为主体，近白粉（0xFFD9E6／0xFFE3EC）只做高光小点，
 *   灰白（0xCCCCCC）只在被截住那一刻出现。没有第二个色相。
 * 层次：抬眼（起手，前方扇缘）→ 贴近扇面（arc）／飞吻弹体（travel）→ 命中散开（cast/kiss）→ 头顶余韵（linger）。
 * 起击收：windup（前方扇缘）→ arc（贴近扇面）／travel（飞吻直飞）→ cast/kiss（落到人身上）→ linger（心软还在）。
 * 范围：贴近扇面用 data.direction／data.range／data.angle，与判定同一组前方几何；命中环只绑在被软到的身体上，
 *   不画满圈心雨暗示身后受效。
 * 数：扇面与散开的数量读服务端 data.hearts（特攻派生），data.hits 决定扇面的亮暗。
 */
const CharmDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "charm_gather", bind: "source", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 13, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.12, 0.03], sizeMode: "sin",
                    color: 0xFFD9E6, alpha: [0.55, 0], light: "full", maxParticles: 30
                },
                {
                    name: "charm_fan", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 20, shape: { kind: "sector", radius: { data: "range", fallback: 3 },
                        angleDegrees: { data: "angle", fallback: 90 }, innerRadius: 0.2 },
                    direction: "outward", speed: [0.02, 0.07], spread: 18,
                    lifetime: [10, 16], size: [0.12, 0.02], sizeMode: "sin",
                    color: 0xF2A0BC, alpha: [0.4, 0], light: "full", maxParticles: 40
                }
            ]
        },
        arc: {
            duration: 26,
            exit: { stop: 12, drain: 18 },
            emitters: [
                {
                    name: "arc_sheet", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 20 }, interval: 2, repeats: 2 },
                    shape: { kind: "sector", radius: { data: "range", fallback: 3 },
                        angleDegrees: { data: "angle", fallback: 90 }, innerRadius: 0.2 },
                    direction: "outward", speed: [0.05, 0.14], spread: 16,
                    lifetime: [10, 18], size: [0.16, 0.04], sizeMode: "index",
                    color: 0xF2A0BC, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "arc_edge", bind: "point", fit: "world", orient: "heading",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "hearts", fallback: 20 } },
                    shape: { kind: "sector", radius: { data: "range", fallback: 3 },
                        innerRadius: { data: "inner", fallback: 2.8 }, angleDegrees: { data: "angle", fallback: 90 } },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [12, 18], size: [0.24, 0.08], sizeMode: "index",
                    color: 0xE86F9E, alpha: [0.6, 0], light: "full", maxParticles: 60
                }
            ]
        },
        cast: {
            duration: 30,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "cast_ring_low", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 20 } }, shape: { kind: "ring", radius: 0.62 },
                    direction: "inward", speed: [0.05, 0.13], spread: 12,
                    lifetime: [10, 18], size: [0.18, 0.04], sizeMode: "sin",
                    color: 0xF2A0BC, alpha: [0.85, 0], light: "full", maxParticles: 60
                },
                {
                    name: "cast_ring_high", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 20 } }, shape: { kind: "ring", radius: 0.5 },
                    direction: "inward", speed: [0.05, 0.13], spread: 12,
                    lifetime: [10, 18], size: [0.16, 0.04], sizeMode: "sin",
                    color: 0xE86F9E, alpha: [0.8, 0], light: "full", maxParticles: 60
                },
                {
                    name: "cast_burst", bind: "target", height: 0.7,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "drop", fallback: 2 }, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.16], spread: 30,
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xF28FB0, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 40
                },
                {
                    name: "cast_spark", bind: "target", height: 0.85,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 16 }, shape: { kind: "sphere_surface", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.14], spread: 20,
                    lifetime: [10, 20], size: [0.09, 0.01],
                    color: 0xFFE3EC, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        travel: {
            duration: 60,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "kiss_glow", bind: "projectile", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    rate: { data: "hearts", fallback: 20 }, shape: { kind: "sphere", radius: 0.14 },
                    direction: "outward", speed: [0.01, 0.05], spread: 24,
                    lifetime: [8, 14], size: [0.08, 0.01],
                    color: 0xFFD9E6, alpha: [0.7, 0], light: "full", maxParticles: 40
                },
                {
                    name: "kiss_trail", bind: "projectile", height: 0.5, trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 10, shape: { kind: "sphere", radius: 0.08 },
                    direction: "outward", speed: [0.01, 0.04],
                    lifetime: [10, 16], size: [0.1, 0.02],
                    color: 0xF2A0BC, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        kiss: {
            duration: 30,
            exit: { stop: 16, drain: 20 },
            emitters: [
                {
                    name: "kiss_scatter", bind: "target", height: 1.15,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    burst: { count: { data: "hearts", fallback: 20 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.04, 0.16], spread: 30,
                    lifetime: [10, 18], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xF28FB0, alpha: [0.95, 0], light: "full", bloom: 0.2, maxParticles: 80
                },
                {
                    name: "kiss_ring", bind: "target", height: 1.0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "hearts", fallback: 20 } }, shape: { kind: "ring", radius: 0.38 },
                    direction: "inward", speed: [0.04, 0.09],
                    lifetime: [12, 18], size: [0.3, 0.14],
                    color: 0xE86F9E, alpha: [0.45, 0], light: "full", maxParticles: 40
                },
                {
                    name: "kiss_spark", bind: "target", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_pink",
                    burst: { count: 14 }, shape: { kind: "sphere_surface", radius: 0.26 },
                    direction: "outward", speed: [0.04, 0.14], spread: 20,
                    lifetime: [10, 20], size: [0.09, 0.01],
                    color: 0xFFE3EC, alpha: [0.9, 0], light: "full", maxParticles: 40
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_hearts", bind: "target", height: 1.05,
                    particle: "world_combat_core:cobblemon/generic/status/infatuation_heart",
                    rate: 3, shape: { kind: "circle", radius: 0.28 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [18, 28], size: [0.16, 0.05], sizeMode: "sin",
                    color: 0xF2A0BC, alpha: [0.3, 0], alphaMode: "sin", light: "full", maxParticles: 14
                },
                {
                    name: "linger_orbs", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 4, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.08, 0.02],
                    color: 0xFFD9E6, alpha: [0.35, 0], light: "world", maxParticles: 16
                }
            ]
        },
        blocked: {
            duration: 20,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "blocked_fade", bind: "point", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/fadeheart_white",
                    rate: 10, shape: { kind: "sphere", radius: 0.22 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xCCCCCC, alpha: [0.4, 0], light: "world", maxParticles: 24
                },
                {
                    name: "blocked_dust", bind: "point", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "outward", speed: [0.02, 0.08], drag: 0.9,
                    lifetime: [10, 18], size: [0.07, 0.01],
                    color: 0xCCCCCC, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_charm", 1, CharmDefinition);
