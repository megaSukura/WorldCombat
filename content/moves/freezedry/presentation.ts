/**
 * 冷冻干燥 的粒子语言（P5 视觉语言 v2）。
 *
 * 一句话：施法者嘴边凝起白霜，一根冰晶拖着冷雾沿直线射向目标；命中时在它身上炸开一圈冰棱与霜雾；
 *   水属性或湿透的目标霜更厚、炸得更开，还会溅起一圈水花。
 * 色相家族：冰蓝 0x9FD8F0 / 0x6FB7E0 与近白 0xEAF6FF 为主，湿目标的溅水用更淡的蓝白；一个冷色相。
 * 层次：凝霜（windup）→ 冰晶＋尾迹（bolt）→ 冰棱爆点（hit／soaked）→ 收霜（fizzle）。
 * 范围：bolt 沿投射物画飞行线，命中爆点绑在目标身上——画的就是冰晶真正打到谁。
 * 运动：冰晶沿直线掠过并留下一条冷尾；命中时冰棱向外炸、霜雾下沉，湿目标再叠一圈向外的水环。
 * 数：服务端把 data.intensity（威力）与 data.soaked（1/0）交给发射器，冻得越狠、目标越湿，冰棱与水花越密。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const FreezedryDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 8, drain: 16 },
            emitters: [
                {
                    name: "frost_gather", bind: "source", offset: [0, 0.8, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    rate: 22, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "inward", speed: [0.02, 0.09],
                    lifetime: [10, 16], size: [0.14, 0.02],
                    color: 0xEAF6FF, alpha: [0.6, 0], light: "full", maxParticles: 40
                },
                {
                    name: "cold_spark", bind: "source", offset: [0, 0.8, 0], height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 12, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.01, 0.05],
                    lifetime: [8, 14], size: [0.07, 0.01],
                    color: 0x9FD8F0, alpha: [0.85, 0], light: "full", maxParticles: 26
                }
            ]
        },
        bolt: {
            duration: 50,
            exit: { stop: 50, drain: 14 },
            emitters: [
                {
                    name: "shard_core", bind: "projectile", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 34, trail: { minDistance: 0.18 }, shape: { kind: "sphere", radius: 0.1 },
                    direction: "velocity", speed: [0.0, 0.03], spin: 18,
                    lifetime: [8, 14], size: [0.2, 0.04],
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", maxParticles: 70
                },
                {
                    name: "cold_trail", bind: "projectile", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/smoke/glowingsmoke_cyan",
                    rate: 26, trail: { minDistance: 0.26 },
                    direction: "velocity", speed: [0.0, 0.02], drag: 0.9,
                    lifetime: [12, 22], size: [0.12, 0.03],
                    color: 0x9FD8F0, alpha: [0.45, 0], light: "full", maxParticles: 60
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "ice_burst", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 1, at: 1 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.08, 0.24],
                    lifetime: [8, 14], size: [0.3, 0.05], sizeMode: "index",
                    alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "shard_spray", bind: "target", height: 0.6, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 1 }, amount: 3,
                    shape: { kind: "sphere_surface", radius: 0.24 },
                    direction: "outward", speed: [0.1, 0.3], gravity: 0.02, spin: 20,
                    lifetime: [10, 18], size: [0.16, 0.03],
                    color: 0xEAF6FF, alpha: [0.9, 0], light: "full", maxParticles: 50
                },
                {
                    name: "frost_ring", bind: "target", offset: [0, 0.08, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ring/ripple",
                    burst: { count: 16 }, shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [12, 20], size: [0.26, 0.02],
                    color: 0x6FB7E0, alpha: [0.6, 0], light: "full", maxParticles: 30
                }
            ]
        },
        soaked: {
            duration: 34,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "deep_ice", bind: "target", height: 0.55, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: 1, at: 1 }, amount: 2,
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.3],
                    lifetime: [8, 16], size: [0.36, 0.06], sizeMode: "index",
                    alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 70
                },
                {
                    name: "deep_shards", bind: "target", height: 0.65, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 1 }, amount: 4,
                    shape: { kind: "sphere_surface", radius: 0.3 },
                    direction: "outward", speed: [0.12, 0.34], gravity: 0.025, spin: 22,
                    lifetime: [10, 20], size: [0.2, 0.03],
                    color: 0xEAF6FF, alpha: [0.95, 0], light: "full", maxParticles: 80
                },
                {
                    name: "splash", bind: "target", offset: [0, 0.2, 0], height: 0, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/water/water_ripple",
                    burst: { count: 22 }, shape: { kind: "ring", radius: 0.56, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.08, 0.2], gravity: 0.02,
                    lifetime: [12, 22], size: [0.24, 0.03],
                    color: 0xBFE8FF, alpha: [0.55, 0], light: "world", maxParticles: 40
                }
            ]
        },
        fizzle: {
            duration: 22,
            exit: { stop: 9, drain: 16 },
            emitters: [
                {
                    name: "shatter", bind: "point", offset: [0, 0.08, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.02, spin: 16,
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xEAF6FF, alpha: [0.7, 0], light: "full", maxParticles: 24
                },
                {
                    name: "melt", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 }, shape: { kind: "sphere", radius: 0.2 },
                    direction: "up", speed: [0.02, 0.08],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0x9FD8F0, alpha: [0.5, 0], light: "world", maxParticles: 20
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_freezedry", 1, FreezedryDefinition);
