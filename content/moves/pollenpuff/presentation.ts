/**
 * 花粉团 / pollenpuff 的客户端表现。
 *
 * 一句话：施法者掌心拢起一团金黄的花粉，低弧抛出去；团子撞到人或落地就散开——对敌人炸出黄绿的
 *   刺花粉与金色爆点，对同伴散成上升的金色花粉与暖光，像两种结果从同一团花粉里分出来。
 * 色相家族：花粉金黄（0xE8B84A）与草绿（0xA8C63A）为主体，暖白（0xFFF2C8）做核心；
 *   一个黄绿家族，不分第二个色相——伤害与回复靠运动（向外炸 vs 向上飘）区分，而不是靠两种颜色。
 * 拍子：起（windup 拢粉）→ 掷（throw 粉团低弧飞出）→ 散（burst 落点散开）→ 分（hit 敌人被炸 / mend 同伴被养）。
 * 范围：burst 绑落点、用 `data.radius`（实际散开半径，fit:world）画球形覆盖——画出的那圈就是判定圈。
 * 运动：粉团沿低弧飞向落点；落地时敌人那侧向外炸、同伴那侧向上飘。
 * 数：`data.motes`（威力与回复比例派生）决定花粉量，`data.healed`（实际恢复量）驱动治疗光的强度，
 *   `data.struck`／`data.mended` 决定爆点与暖光点数。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const PollenpuffDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.35, 0.25], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 16, shape: { kind: "sphere", radius: 0.16 },
                    direction: "inward", speed: [0.02, 0.08], spin: 14,
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0xE8B84A, alpha: [0.7, 0], light: "world", maxParticles: 30
                },
                {
                    name: "glint", bind: "source", offset: [0, 0.35, 0.25], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 8, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.06],
                    lifetime: [7, 12], size: [0.08, 0.01],
                    color: 0xFFF2C8, alpha: [0.85, 0], light: "full", maxParticles: 18
                }
            ]
        },
        throw: {
            duration: 50,
            exit: { stop: 50, drain: 10 },
            emitters: [
                {
                    name: "puff", bind: "projectile", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 22, trail: { minDistance: 0.16 }, shape: { kind: "sphere", radius: 0.08 },
                    direction: "up", speed: [0.01, 0.04], spin: 16,
                    lifetime: [7, 14], size: [0.1, 0.03],
                    color: 0xE8B84A, alpha: [0.85, 0], light: "world", maxParticles: 70
                },
                {
                    name: "trail", bind: "projectile", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, trail: { minDistance: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [8, 14], size: [0.05, 0.01],
                    color: 0xFFF2C8, alpha: [0.6, 0], light: "full", maxParticles: 44
                }
            ]
        },
        burst: {
            duration: 24,
            exit: { stop: 11, drain: 14 },
            emitters: [
                {
                    name: "cloud", bind: "point", height: 0.2, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "motes", fallback: 20 }, interval: 2, repeats: 2 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 1.9 } },
                    direction: "outward", speed: [0.05, 0.2], spread: 55, drag: 0.9, gravity: 0.006,
                    lifetime: [12, 22], size: [0.14, 0.04], spin: 16,
                    color: 0xE8B84A, alpha: [0.85, 0], light: "world", maxParticles: 110
                },
                {
                    name: "grit", bind: "point", height: 0.15, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/grass/seed",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 1.9 } },
                    direction: "outward", speed: [0.06, 0.22], gravity: 0.02, spin: 20,
                    lifetime: [10, 20], size: [0.09, 0.02],
                    color: 0xA8C63A, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "ring", bind: "point", offset: [0, 0.04, 0], height: 0, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: 12 }, shape: { kind: "ring", radius: { data: "radius", fallback: 1.9 }, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.05, 0.16],
                    lifetime: [10, 16], size: [0.18, 0.07],
                    color: 0xFFF2C8, alpha: [0.55, 0], light: "full", maxParticles: 26
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 10, drain: 14 },
            emitters: [
                {
                    name: "impact", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_bug",
                    burst: { count: { data: "motes", fallback: 18 } }, amount: 1,
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.1, 0.36], spread: 22,
                    lifetime: [6, 12], size: [0.4, 0.07], sizeMode: "index",
                    color: 0xC8E060, alpha: [0.95, 0], light: "full", bloom: 0.35, maxParticles: 80
                },
                {
                    name: "spray", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere_surface", radius: 0.32 },
                    direction: "outward", speed: [0.16, 0.44], spread: 24, drag: 0.9,
                    lifetime: [9, 16], size: [0.11, 0.02],
                    color: 0xE8B84A, alpha: [0.8, 0], light: "world", maxParticles: 70
                }
            ]
        },
        mend: {
            duration: 26,
            exit: { stop: 11, drain: 16 },
            emitters: [
                {
                    name: "soothe", bind: "target", height: 0.35, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "up", speed: [0.03, 0.14],
                    lifetime: [12, 22], size: [0.09, 0.01],
                    color: 0xFFF2C8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 60
                },
                {
                    name: "warm", bind: "target", height: 0.5, fit: "body",
                    particle: "world_combat_core:cobblemon/generic/orb/xsboost",
                    burst: { count: 6, interval: 3, repeats: 3 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "up", speed: [0.02, 0.1],
                    lifetime: [12, 20], size: [0.1, 0.02],
                    color: 0xE8B84A, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_pollenpuff", 1, PollenpuffDefinition);
