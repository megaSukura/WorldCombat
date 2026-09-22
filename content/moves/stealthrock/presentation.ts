/**
 * 隐形岩 / stealthrock 的客户端表现。
 *
 * 一句话：脚边碎石被抬到半空，散成一片缓缓浮沉的石阵悬在那里；有东西闯进来时，几块石头从阵里砸向它。
 * 色相家族：岩石灰（0x9E9A90 偏冷的石面）为主、冷白（0xE8E6DE）做落地高光，`sparkle/smallsparkle` 原色做尖端反光。
 * 拍子：起（windup 起石）→ 抬（throw 抛出 / raise 散成阵）→ 驻（hum 悬浮 / hit 砸中）→ 收（hum 自然淡出）。
 * 范围：raise 与 hum 都是 `bind:"point"`、`fit:"none"`；`data.radius` 既画地面圈也画悬浮球面，画出来的就是会被砸的空域。
 * 运动：碎石被抛出后沿速度走；散开时从地面向上升起成球面，驻留时每块石沿竖直方向缓缓浮沉；砸中时石块朝目标下坠。
 * 数：`data.stones`（特攻派生）决定悬浮石与砸落石块的数量，`data.heavy`（沉岩/浮岩）决定落地的重击亮度，`data.scale`（半径/参考 2.6）控制尺寸。
 * 参照节：视觉语言第二、三、四、五、七、九节。
 */
const StealthRockDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 16,
            exit: { stop: 7, drain: 14 },
            emitters: [
                {
                    name: "lift", bind: "source", offset: [0, 0.2, 0.3], height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/earth",
                    rate: 18, shape: { kind: "sphere", radius: 0.42 },
                    direction: "down", speed: [0.01, 0.06], spin: 10,
                    lifetime: [8, 14], size: [0.1, 0.02],
                    color: 0x9E9A90, alpha: [0.7, 0], maxParticles: 50
                }
            ]
        },
        throw: {
            duration: 22,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "stones", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: 22, shape: { kind: "sphere", radius: 0.16 },
                    direction: "velocity", speed: [0.02, 0.07], spread: 22, spin: 24,
                    lifetime: [8, 14], size: [0.24, 0.05],
                    color: 0x9E9A90, alpha: [0.85, 0], maxParticles: 60
                },
                {
                    name: "grit", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.3 },
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 3, interval: 1, repeats: 12 }, shape: { kind: "point" },
                    direction: "velocity", speed: [0, 0.02],
                    lifetime: [8, 14], size: [0.08, 0.02],
                    color: 0xE8E6DE, alpha: [0.5, 0], maxParticles: 40
                }
            ]
        },
        raise: {
            duration: 38,
            exit: { stop: 14, drain: 22 },
            emitters: [
                {
                    name: "ground_ring", bind: "point", offset: [0, 0.12, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 40 }, shape: { kind: "ring", radius: { data: "radius", fallback: 2.6 } },
                    direction: "outward", speed: [0.05, 0.18],
                    lifetime: [10, 20], size: [0.26, 0.6],
                    color: 0xE8E6DE, alpha: [0.6, 0], maxParticles: 80
                },
                {
                    name: "rise", bind: "point", offset: [0, 0.1, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "stones", fallback: 18 }, interval: 3, repeats: 3 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.06, 0.18], spread: 14, spin: 30,
                    lifetime: [14, 26], size: [0.3, 0.06],
                    color: 0x9E9A90, alpha: [0.9, 0], maxParticles: 140
                },
                {
                    name: "dust_cloud", bind: "point", offset: [0, 0.05, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 44 }, shape: { kind: "circle", radius: { data: "radius", fallback: 2.6 } },
                    direction: "up", speed: [0.03, 0.1],
                    lifetime: [14, 26], size: [0.1, 0.02],
                    color: 0xE8E6DE, alpha: [0.45, 0], maxParticles: 110
                }
            ]
        },
        hum: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "hover", bind: "point", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    rate: { data: "stones", fallback: 18 },
                    shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 2.6 } },
                    gravity: 0, velocity: { y: "0.02*(1-2*t)" }, spin: 12,
                    lifetime: [18, 30], size: [0.22, 0.34],
                    color: 0x9E9A90, alpha: [0.55, 0.2], maxParticles: 120
                },
                {
                    name: "embers", bind: "point", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    rate: 10, shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 2.6 } },
                    gravity: 0, velocity: { y: "0.01*(1-2*t)" },
                    lifetime: [14, 24], size: [0.08, 0.22],
                    color: 0xE8E6DE, alpha: [0.3, 0], light: "full", maxParticles: 40
                },
                {
                    name: "glints", bind: "point", offset: [0, 0, 0], height: 0, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 6, shape: { kind: "sphere_surface", radius: { data: "radius", fallback: 2.6 } },
                    gravity: 0,
                    lifetime: [10, 18], size: [0.06, 0.02],
                    color: 0xFFFFFF, alpha: [0.4, 0], light: "full", maxParticles: 24
                }
            ]
        },
        hit: {
            duration: 26,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "smash", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_rock",
                    burst: { count: 3, interval: 3, repeats: 2, at: 1 },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.1, 0.26], spread: 24,
                    lifetime: [6, 12], size: [0.4, 0.06], sizeMode: "index",
                    color: 0xE8E6DE, alpha: [1, 0], maxParticles: 50
                },
                {
                    name: "fall", bind: "target", height: 1.3,
                    particle: "world_combat_core:cobblemon/generic/large_rock",
                    burst: { count: { data: "stones", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "down", speed: [0.08, 0.2], spread: 20, spin: 40,
                    lifetime: [8, 16], size: [0.2, 0.04],
                    color: 0x9E9A90, alpha: [0.9, 0], maxParticles: 50
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_stealthrock", 1, StealthRockDefinition);
