/**
 * 冰球 / iceball 的客户端表现。
 *
 * 一句话：一颗冰蓝的球在怀里逐层包厚、被直直推出去，拖着冰屑尾迹飞向瞄准方向；撞上真实目标就炸开一圈冰石并再厚一层，
 * 撞到门框或空飞就当场碎成一地冰屑，不再回头。最后碎开处在真实碰撞点冻出一小片冰面。
 * 色相家族：冰蓝与霜白（iceshard／icy_snow／impact_ice），冷光细节（glowingsparkle_cyan），中性尘（tinydust／powdered_snow）。
 * 拍子：起（charge 抱球）→ 聚（shell 身前逐层包壳）→ 飞（flight 尾迹）→ 击（hit 命中）／破（breach 撞框/空发）→ 收（shatter 碎开／freeze 结冰）。
 * 范围：flight 的球壳半径直接绑服务端真实判定半径 `data.radius`（fit:"world"，单位=格），命中与碎开都发生在服务端真取的位置。
 * 运动：发射器绑 `projectile` 真身，随球飞行；不再有回头一幕，空发在 breach 当场碎。
 * 数：尾迹密度与命中冰石绑定 `data.shards`（物攻换算），亮度绑定 `data.intensity`，球壳大小绑定 `data.radius`——画面与机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const IceballDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "windup", fallback: 7 },
            exit: { stop: 3, drain: 8 },
            emitters: [
                {
                    name: "frost_gather", bind: "source", offset: [0, 0.7, 0], height: 0.5,
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: 10, shape: { kind: "sphere", radius: 0.45 },
                    direction: "inward", speed: [0.03, 0.13],
                    lifetime: [6, 12], size: [0.12, 0.03],
                    color: 0xA9D6E8, alpha: [0.75, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "cold_mist", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 12, shape: { kind: "sphere", radius: 0.4 },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [6, 12], size: [0.1, 0.03],
                    color: 0xD6F2FA, alpha: [0.4, 0], light: "world", maxParticles: 28
                }
            ]
        },
        shell: {
            duration: 12,
            exit: { stop: 5, drain: 10 },
            emitters: [
                {
                    name: "shell_frost", bind: "source", offset: [0, 0.6, 0], height: 0.4, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: { data: "shards", fallback: 14 } },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.5 } },
                    direction: "inward", speed: [0.03, 0.14],
                    lifetime: [5, 10], size: [0.11, 0.03],
                    color: 0xA9D6E8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "shell_mist", bind: "source", offset: [0, 0.6, 0], height: 0.4, fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: 8 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.5 } },
                    direction: "inward", speed: [0.02, 0.08],
                    lifetime: [7, 13], size: [0.08, 0.02],
                    color: 0xEAF8FF, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        },
        flight: {
            duration: 90,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "ball_shell", bind: "projectile", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: { data: "shards", fallback: 16 }, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.45 } },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xA9D6E8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 60
                },
                {
                    name: "ball_trail", bind: "projectile", fit: "world", trail: { minDistance: 0.35 },
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 26, shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.06], drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0xD6F2FA, alpha: [0.5, 0], light: "world", maxParticles: 80
                },
                {
                    name: "ball_glow", bind: "projectile", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 6, shape: { kind: "sphere", radius: { data: "radius", fallback: 0.45 } },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.12, 0.02],
                    color: 0xEAF8FF, alpha: [0.6, 0], light: "full", bloom: 0.45, maxParticles: 30
                }
            ]
        },
        hit: {
            duration: 22,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "ice_burst", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "shards", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.45 } },
                    direction: "outward", speed: [0.08, 0.24], spread: 18,
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xD6F2FA, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 70
                },
                {
                    name: "shatter_shard", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.45 } },
                    direction: "outward", speed: [0.06, 0.2], spread: 26, spin: 8,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xA9D6E8, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "powder", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.45 } },
                    direction: "outward", speed: [0.03, 0.16], gravity: 0.05, drag: 0.9,
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xEAF8FF, alpha: [0.5, 0], light: "world", maxParticles: 60
                }
            ]
        },
        breach: {
            duration: 20,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "break_burst", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "shards", fallback: 14 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.45 } },
                    direction: "outward", speed: [0.07, 0.22],
                    lifetime: [5, 10], size: [0.26, 0.05], sizeMode: "index",
                    color: 0xD6F2FA, alpha: [0.95, 0], light: "full", bloom: 0.3, maxParticles: 48
                },
                {
                    name: "break_frost", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 12 }, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.45 } },
                    direction: "outward", speed: [0.03, 0.15], gravity: 0.05, drag: 0.9,
                    lifetime: [10, 20], size: [0.08, 0.02],
                    color: 0xEAF8FF, alpha: [0.45, 0], light: "world", maxParticles: 44
                }
            ]
        },
        shatter: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "break_flash", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/smallexplosion",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.5 } },
                    lifetime: [8, 16], size: [0.5, 0.1],
                    color: 0xEAF8FF, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 6
                },
                {
                    name: "break_shards", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: { data: "radius", fallback: 0.5 } },
                    direction: "outward", speed: [0.06, 0.22], spread: 36, spin: 10,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [10, 20], size: [0.12, 0.02],
                    color: 0xA9D6E8, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 50
                },
                {
                    name: "settle_ring", bind: "point", fit: "world",
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "circle", radius: { data: "radius", fallback: 0.5 } },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.04, drag: 0.9,
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0xEAF8FF, alpha: [0.45, 0], light: "world", maxParticles: 36
                }
            ]
        },
        freeze: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "frosting", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 12, at: 0 },
                    shape: { kind: "sphere", radius: 0.6 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [10, 18], size: [0.1, 0.02],
                    color: 0xD6F2FA, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_iceball", 1, IceballDefinition);
