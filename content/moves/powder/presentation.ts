/**
 * 粉尘 / powder 的客户端表现。
 *
 * 一句话：施法者掌心拢起一团乳白的细粉，低弧抛出贴到对手身上；粉层在它身上薄薄覆住、缓缓剥落，
 *   直到对手点火——那一刻粉尘当场炸成一团暖橙的火粉，随即熄灭。
 * 色相家族：乳白与米黄（0xE8D9A0／0xC9B878）撑起粉团与贴附层，暖橙（0xFF9A3C）与近白（0xFFF3D0）
 *   只给引爆的一炸（火与烟是一家）。
 * 拍子：起（windup 拢粉）→ 抛（throw 粉团低弧飞出）→ 附（dust 贴在目标身上）→ 爆（blast 点火一炸）。
 * 范围：dust／blast 绑在目标身上，按体型适配；粉团飞行绑 projectile，命中处即贴上的一点。
 * 运动：粉团沿低弧飞向目标；贴附层在目标身上缓缓剥落；引爆时火粉向外一炸随即下沉熄灭。
 * 数：尘粒数量由 `data.motes`（特攻派生）驱动；`data.blast`（爆炸比例）只体现在爆开的一团强度与半径。
 * 参照节：视觉语言第一、二、三、四、六、七、九节。
 */
const PowderDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 12,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.2, 0.3], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    rate: 12, shape: { kind: "sphere", radius: 0.14 },
                    direction: "inward", speed: [0.01, 0.06], spin: 14,
                    lifetime: [8, 14], size: [0.09, 0.03],
                    color: 0xE8D9A0, alpha: [0.6, 0], light: "world", maxParticles: 26
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
                    rate: 20, trail: { minDistance: 0.16 },
                    shape: { kind: "sphere", radius: 0.08 },
                    direction: "up", speed: [0.01, 0.04], spin: 16,
                    lifetime: [7, 14], size: [0.1, 0.03],
                    color: 0xE8D9A0, alpha: [0.85, 0], light: "world", maxParticles: 60
                },
                {
                    name: "motes", bind: "projectile", height: 0.1,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 14, trail: { minDistance: 0.3 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [10, 18], size: [0.05, 0.01],
                    color: 0xFFF3D0, alpha: [0.6, 0], light: "world", maxParticles: 36
                }
            ]
        },
        dust: {
            duration: 30,
            exit: { stop: 14, drain: 16 },
            emitters: [
                {
                    name: "coat", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "motes", fallback: 14 } },
                    shape: { kind: "sphere", radius: 0.32 },
                    direction: "inward", speed: [0.03, 0.12], spin: 14,
                    lifetime: [12, 22], size: [0.1, 0.03],
                    color: 0xE8D9A0, alpha: [0.8, 0], light: "world", maxParticles: 80
                },
                {
                    name: "cling", bind: "target", height: 0.35,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 12 },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "down", speed: [0.02, 0.08], gravity: 0.015, drag: 0.92,
                    lifetime: [10, 20], size: [0.05, 0.01], alphaMode: "sin",
                    color: 0xC9B878, alpha: [0.5, 0], light: "world", maxParticles: 40
                }
            ]
        },
        blast: {
            duration: 30,
            exit: { stop: 14, drain: 18 },
            emitters: [
                {
                    name: "fire", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_fire",
                    burst: { count: 3 }, shape: { kind: "sphere_surface", radius: 0.4 },
                    direction: "outward", speed: [0.1, 0.34], spread: 24,
                    lifetime: [8, 16], size: [0.42, 0.08], sizeMode: "index",
                    color: 0xFF9A3C, alpha: [1, 0], light: "full", bloom: 0.4, maxParticles: 18
                },
                {
                    name: "smoke", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/fire/cloudyfire_white",
                    burst: { count: { data: "motes", fallback: 16 } },
                    shape: { kind: "sphere", radius: 0.36 },
                    direction: "outward", speed: [0.06, 0.24], spread: 40, gravity: -0.01, drag: 0.9,
                    lifetime: [10, 20], size: [0.2, 0.05], sizeMode: "index",
                    color: 0xE8D9A0, alpha: [0.8, 0], light: "world", maxParticles: 70
                },
                {
                    name: "sparks", bind: "target", height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.12, 0.4], gravity: 0.03,
                    lifetime: [8, 16], size: [0.08, 0.01],
                    color: 0xFFF3D0, alpha: [0.9, 0], light: "full", bloom: 0.3, maxParticles: 30
                }
            ]
        },
        puff: {
            duration: 18,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "settle", bind: "point",
                    particle: "world_combat_core:cobblemon/generic/powder",
                    burst: { count: { data: "motes", fallback: 12 } },
                    shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.12], gravity: 0.02, drag: 0.9,
                    lifetime: [8, 16], size: [0.08, 0.02], spin: 12,
                    color: 0xC9B878, alpha: [0.45, 0], light: "world", maxParticles: 40
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_powder", 1, PowderDefinition);
