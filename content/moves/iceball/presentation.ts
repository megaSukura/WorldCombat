/**
 * 冰球 / iceball 的客户端表现。
 *
 * 一句话：一颗冰蓝的球从怀里被抛出去、拖着冰屑尾迹飞向对手，撞上就炸开一圈冰石；它掉头飞回来、壳上又厚一层，
 * 球一次比一次大；最后在落点碎成一地冰面，寒气贴地散开。
 * 色相家族：冰蓝与霜白（iceshard／icy_snow／impact_ice），冷光细节（glowingsparkle_cyan），中性尘（tinydust）。
 * 拍子：起（charge 抱球）→ 飞（flight 尾迹）→ 击（hit 碎冰）→ 回（return 回头）→ 收（shatter 碎开／freeze 结冰）。
 * 范围：flight 的尾迹与 impact 的位置由真实飞行决定；hit 的爆开半径随球径（`data.scale`）；freeze 画在落点。
 * 运动：发射器绑 `projectile` 真身，随球飞行并自动回头；球径随趟数增大（服务端传 `data.scale`）。
 * 数：尾迹密度绑定 `data.shards`（物攻换算），命中爆开的冰石绑定 `data.shards`、亮度绑定 `data.intensity`，
 *   球体大小绑定 `data.scale`——画面里的数与机制里的数一致。
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
        flight: {
            duration: 40,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "ball_shell", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    rate: { data: "shards", fallback: 16 }, shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.02, 0.1],
                    lifetime: [5, 10], size: [0.1, 0.02],
                    color: 0xA9D6E8, alpha: [0.7, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "ball_trail", bind: "projectile", offset: [0, 0, 0], trail: { minDistance: 0.35 },
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    rate: 26, shape: { kind: "point" },
                    direction: "outward", speed: [0.01, 0.06], drag: 0.9,
                    lifetime: [8, 14], size: [0.1, 0.03],
                    color: 0xD6F2FA, alpha: [0.5, 0], light: "world", maxParticles: 60
                },
                {
                    name: "ball_glow", bind: "projectile", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_cyan",
                    rate: 6, shape: { kind: "sphere", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.01, 0.05],
                    lifetime: [5, 10], size: [0.12, 0.02],
                    color: 0xEAF8FF, alpha: [0.6, 0], light: "full", bloom: 0.45, maxParticles: 24
                }
            ]
        },
        hit: {
            duration: 24,
            exit: { stop: 6, drain: 12 },
            emitters: [
                {
                    name: "ice_burst", bind: "point", offset: [0, 0, 0],
                    particle: "world_combat_core:cobblemon/generic/impact/impact_ice",
                    burst: { count: { data: "shards", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.08, 0.24], spread: 18,
                    lifetime: [6, 12], size: [0.28, 0.05], sizeMode: "index",
                    color: 0xD6F2FA, alpha: [1, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "shatter_shard", bind: "point", offset: [0, 0.1, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 8, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.06, 0.2], spread: 26, spin: 8,
                    gravity: 0.06, drag: 0.92,
                    lifetime: [10, 18], size: [0.12, 0.02],
                    color: 0xA9D6E8, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 30
                },
                {
                    name: "powder", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: { data: "shards", fallback: 16 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    direction: "outward", speed: [0.03, 0.16], gravity: 0.05, drag: 0.9,
                    lifetime: [12, 22], size: [0.08, 0.02],
                    color: 0xEAF8FF, alpha: [0.5, 0], light: "world", maxParticles: 48
                }
            ]
        },
        return: {
            duration: 20,
            exit: { stop: 6, drain: 10 },
            emitters: [
                {
                    name: "loop_back", bind: "source", offset: [0, 0.6, 0], height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/ice/icy_snow",
                    burst: { count: 10, at: 0 },
                    shape: { kind: "sphere", radius: 0.35 },
                    direction: "outward", speed: [0.03, 0.12],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xD6F2FA, alpha: [0.4, 0], light: "world", maxParticles: 20
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
        },
        shatter: {
            duration: 26,
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "break_flash", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/smallexplosion",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "sphere", radius: 0.4 },
                    lifetime: [8, 16], size: [0.5, 0.1],
                    color: 0xEAF8FF, alpha: [0.85, 0], light: "full", bloom: 0.5, maxParticles: 6
                },
                {
                    name: "break_shards", bind: "point", offset: [0, 0.2, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/iceshard",
                    burst: { count: 16, at: 0 },
                    shape: { kind: "sphere", radius: 0.5 },
                    direction: "outward", speed: [0.06, 0.22], spread: 36, spin: 10,
                    gravity: 0.07, drag: 0.9,
                    lifetime: [10, 20], size: [0.12, 0.02],
                    color: 0xA9D6E8, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 40
                },
                {
                    name: "settle_ring", bind: "point", offset: [0, 0.05, 0],
                    particle: "world_combat_core:cobblemon/generic/ice/powdered_snow",
                    burst: { count: 14, at: 0 },
                    shape: { kind: "circle", radius: { data: "scale", fallback: 1 } },
                    direction: "outward", speed: [0.04, 0.14], gravity: 0.04, drag: 0.9,
                    lifetime: [12, 22], size: [0.09, 0.02],
                    color: 0xEAF8FF, alpha: [0.45, 0], light: "world", maxParticles: 30
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_iceball", 1, IceballDefinition);
