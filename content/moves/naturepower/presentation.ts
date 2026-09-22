/**
 * 自然之力 / Nature Power 的粒子语言。
 *
 * 一句话：脚边的地面先被叫醒（土色召唤环），接着一道贴地的地脉沿地面冲向目标，抵达时按脚下的场地炸开——
 *   草木抽叶、水流激浪、地火迸焰、大地崩石，踩不到实体地面时只剩一记普通冲击。
 * 色相家族：大地中性色 0x9C8B6A 是所有场地的底盘，场地色只在地脉与爆发上出现（草绿 0x8FCF6E、水蓝 0x7FD7F0、
 *   火橙 0xFF9A3C、岩灰 0xC9C6BE、普通 0xE8E4D8）——一条地脉，一种颜色。
 * 拍子：起（windup）／行（surge_*）／击（burst_*）。
 * 范围：地脉与爆发都绑 point（fit none），尺寸随 data.scale = 涌动半宽 / 0.8 缩放；玩家看得出这条线扫到哪。
 * 机制驱动：地脉与爆发的粒子数绑定 data.bursts（由特攻算出），爆发再按命中强度 data.intensity 放大；
 *   场地后缀由施法者脚下的方块决定，所以同一招在草地上与在水里放出来是两种颜色。
 */
function naturepowerSurgeEmitters(particle: string, accent: number): ParticleEmitter[] {
    return [
        {
            name: "surge_band", bind: "point", offset: [0, 0.06, 0], height: 0, fit: "none",
            particle: particle,
            burst: { count: { data: "bursts", fallback: 10 } }, shape: { kind: "circle", radius: 0.55 },
            direction: "outward", speed: [0.03, 0.13], drag: 0.85, spin: 6,
            lifetime: [8, 16], size: [0.16, 0.03],
            color: accent, alpha: [0.9, 0], light: "full", maxParticles: 60
        },
        {
            name: "surge_dust", bind: "point", offset: [0, 0.03, 0], height: 0, fit: "none",
            particle: "world_combat_core:cobblemon/generic/tinydust",
            burst: { count: 8 }, shape: { kind: "circle", radius: 0.4 },
            direction: "up", speed: [0.02, 0.07], gravity: 0.02,
            lifetime: [8, 16], size: [0.06, 0.01],
            color: 0x9C8B6A, alpha: [0.7, 0], light: "world", maxParticles: 34
        }
    ];
}
function naturepowerBurstEmitters(flash: string, fly: string, accent: number): ParticleEmitter[] {
    return [
        {
            name: "impact_flash", bind: "point", offset: [0, 0.25, 0], height: 0, fit: "none",
            particle: flash,
            burst: { count: 2 }, shape: { kind: "sphere", radius: 0.2 },
            direction: "outward", speed: [0.0, 0.05],
            lifetime: 8, size: [0.36, 0.05], sizeMode: "index",
            color: 0xFFFFFF, alpha: [1, 0], light: "full", bloom: 0.3, maxParticles: 6
        },
        {
            name: "impact_fly", bind: "point", offset: [0, 0.18, 0], height: 0, fit: "none",
            particle: fly,
            burst: { count: { data: "bursts", fallback: 14 } }, shape: { kind: "sphere", radius: 0.32 },
            direction: "outward", speed: [0.06, 0.18], gravity: 0.012, drag: 0.92, spin: 8,
            lifetime: [10, 22], size: [0.13, 0.02],
            color: accent, alpha: [0.95, 0], light: "full", maxParticles: 90
        },
        {
            name: "impact_ring", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
            particle: "world_combat_core:cobblemon/generic/ring/mediumring",
            burst: { count: 2 }, shape: { kind: "circle", radius: 0.6 },
            direction: "outward", speed: [0.04, 0.12],
            lifetime: [12, 22], size: [0.3, 0.7],
            color: accent, alpha: [0.6, 0], light: "full", maxParticles: 12
        }
    ];
}

const NaturepowerDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "call_ring", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 16, interval: 3, repeats: 2 }, shape: { kind: "ring", radius: 0.9 },
                    direction: "inward", speed: [0.03, 0.08],
                    lifetime: [10, 16], size: [0.32, 0.12],
                    color: 0x9C8B6A, alpha: [0.6, 0], light: "world", maxParticles: 30
                },
                {
                    name: "call_dust", bind: "source", offset: [0, 0.05, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, shape: { kind: "circle", radius: 0.7 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [10, 18], size: [0.06, 0.01],
                    color: 0x9C8B6A, alpha: [0.6, 0], light: "world", maxParticles: 36
                }
            ]
        },
        surge_verdant: { duration: 12, exit: { stop: 4, drain: 8 }, emitters: naturepowerSurgeEmitters("world_combat_core:cobblemon/generic/grass/razorleaf", 0x8FCF6E) },
        surge_water: { duration: 12, exit: { stop: 4, drain: 8 }, emitters: naturepowerSurgeEmitters("world_combat_core:cobblemon/generic/water/rainsplash", 0x7FD7F0) },
        surge_ember: { duration: 12, exit: { stop: 4, drain: 8 }, emitters: naturepowerSurgeEmitters("world_combat_core:cobblemon/generic/fire/flame", 0xFF9A3C) },
        surge_earth: { duration: 12, exit: { stop: 4, drain: 8 }, emitters: naturepowerSurgeEmitters("world_combat_core:cobblemon/generic/large_rock", 0xC9C6BE) },
        surge_plain: { duration: 12, exit: { stop: 4, drain: 8 }, emitters: naturepowerSurgeEmitters("world_combat_core:cobblemon/generic/sparkle/mediumsparkle", 0xE8E4D8) },
        burst_verdant: { duration: 30, exit: { stop: 10, drain: 20 }, emitters: naturepowerBurstEmitters("world_combat_core:cobblemon/generic/impact/impact_grass", "world_combat_core:cobblemon/generic/grass/leaf", 0x8FCF6E) },
        burst_water: { duration: 30, exit: { stop: 10, drain: 20 }, emitters: naturepowerBurstEmitters("world_combat_core:cobblemon/generic/impact/impact_water", "world_combat_core:cobblemon/generic/water/giantsplash", 0x7FD7F0) },
        burst_ember: { duration: 30, exit: { stop: 10, drain: 20 }, emitters: naturepowerBurstEmitters("world_combat_core:cobblemon/generic/impact/impact_fire", "world_combat_core:cobblemon/generic/fire/ember", 0xFF9A3C) },
        burst_earth: { duration: 30, exit: { stop: 10, drain: 20 }, emitters: naturepowerBurstEmitters("world_combat_core:cobblemon/generic/impact/impact_rock", "world_combat_core:cobblemon/generic/large_rock", 0xC9C6BE) },
        burst_plain: { duration: 28, exit: { stop: 10, drain: 18 }, emitters: naturepowerBurstEmitters("world_combat_core:cobblemon/generic/impact/impact_normal", "world_combat_core:cobblemon/generic/orb/xsfadeorb", 0xE8E4D8) }
    }
};

WorldCombatParticles.scene("world_combat:move_naturepower", 1, NaturepowerDefinition);
