/**
 * 神鸟猛击 / skyattack 的客户端表现。
 *
 * 一句话：施法者停在地上把光收进身体、周身起风（蓄），随后腾空（腾），拖着一条向下的光柱砸向同一个点（坠），
 *   落点炸开一圈冲击环与碎光，被压中的人头顶冒出金星（懵）。
 * 色相家族：暖白金光（0xFFE8A8 主体、0xFFF6DC 高光）＋淡天蓝（0xBFD9EF）做风与速度线；没有第二个色相。
 * 拍子：起 charge（聚光，由少到多）→ 腾 rise（上升速度线）→ 坠 fall（向下光柱，`ratio` 越接近 1 越亮）→
 *   击 strike（命中迸光）／落 land（冲击环）→ 懵 flinch。
 * 范围：land 的地面环用 `data.scale`（落点半径换算）铺开，画出来的就是这一砸覆盖的地；站出环外就压不到。
 * 运动：唯一有形状的运动是垂直方向——rise 向上、fall 向下拖着光柱、strike 在命中点爆开；一眼看出是从天而降。
 * 数：`data.orbs`（蓄势派生）绑定聚光量，`data.shock`（物攻派生）绑定冲击环与碎光数量，与机制一致。
 * 参照节：视觉语言第二、三、四、六、七、九节。
 */
const SkyAttackDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        charge: {
            duration: { data: "charge", fallback: 26 },
            exit: { stop: 8, drain: 14 },
            emitters: [
                {
                    name: "gather", bind: "source", offset: [0, 0.8, 0], height: 0.25,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 12, shape: { kind: "sphere_surface", radius: 0.55 },
                    direction: "inward", speed: [0.03, 0.13],
                    lifetime: [7, 13], size: [0.08, 0.01],
                    color: 0xFFE8A8, alpha: [0.85, 0], light: "full", bloom: 0.35, maxParticles: 60
                },
                {
                    name: "ring", bind: "source", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/smallring",
                    burst: { count: { data: "orbs", fallback: 10 }, interval: 6, repeats: 3 },
                    shape: { kind: "ring", radius: 0.5, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.02, 0.08],
                    lifetime: [8, 14], size: [0.16, 0.04],
                    color: 0xBFD9EF, alpha: [0.5, 0], light: "world", maxParticles: 30
                }
            ]
        },
        rise: {
            duration: 22,
            exit: { stop: 8, drain: 12 },
            emitters: [
                {
                    name: "ascend", bind: "source", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/swirlingwind",
                    rate: 26, shape: { kind: "cylinder", radius: 0.35, length: 0.9 },
                    direction: "up", speed: [0.08, 0.3],
                    lifetime: [6, 12], size: [0.14, 0.02], spin: 8,
                    color: 0xBFD9EF, alpha: [0.7, 0], light: "world", maxParticles: 90
                },
                {
                    name: "spark", bind: "source", offset: [0, 0.5, 0], height: 0.2,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    rate: 14, shape: { kind: "sphere", radius: 0.4 },
                    direction: "up", speed: [0.04, 0.16],
                    lifetime: [6, 12], size: [0.07, 0.01],
                    color: 0xFFE8A8, alpha: [0.8, 0], light: "full", bloom: 0.35, maxParticles: 40
                }
            ]
        },
        fall: {
            exit: { drain: 16 },
            emitters: [
                {
                    name: "column", bind: "source", offset: [0, 0.4, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/orb/glowing_dots_cyan",
                    rate: 40, shape: { kind: "line", length: 1.2 },
                    direction: "down", speed: [0.05, 0.2],
                    lifetime: [5, 10], size: [0.12, 0.02], sizeMode: "index",
                    color: 0xFFF6DC, alpha: [0.8, 0], light: "full", bloom: 0.3, maxParticles: 120
                },
                {
                    name: "trail", bind: "source", offset: [0, 0.2, 0], height: 0.2, fit: "none",
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    rate: 30, shape: { kind: "line", length: 0.9 },
                    direction: "down", speed: [0.03, 0.12],
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0xBFD9EF, alpha: [0.5, 0], light: "world", maxParticles: 80
                }
            ]
        },
        strike: {
            duration: 24,
            exit: { stop: 10, drain: 16 },
            emitters: [
                {
                    name: "burst", bind: "target", height: 0.4,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_flying",
                    burst: { count: { data: "shock", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.34 },
                    direction: "outward", speed: [0.1, 0.36], spread: 30,
                    lifetime: [6, 13], size: [0.32, 0.06], sizeMode: "index",
                    color: 0xFFF6DC, alpha: [0.95, 0], light: "full", bloom: 0.4, maxParticles: 110
                },
                {
                    name: "spark", bind: "target", height: 0.45,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle_yellow",
                    burst: { count: { data: "shock", fallback: 24 }, at: 0 },
                    shape: { kind: "sphere", radius: 0.28 },
                    direction: "outward", speed: [0.04, 0.16], gravity: 0.05, drag: 0.92,
                    lifetime: [8, 15], size: [0.07, 0.01],
                    color: 0xFFE8A8, alpha: [0.9, 0], light: "full", bloom: 0.4, maxParticles: 70
                }
            ]
        },
        flinch: {
            duration: 20,
            exit: { stop: 7, drain: 12 },
            emitters: [
                {
                    name: "daze", bind: "target", offset: [0, 1.3, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/star",
                    burst: { count: 4, interval: 5, repeats: 3 },
                    shape: { kind: "circle", radius: 0.35, thickness: 0 },
                    direction: "up", speed: [0.02, 0.06],
                    lifetime: [9, 15], size: [0.12, 0.03],
                    color: 0xFFE8A8, alpha: [0.85, 0], light: "full", maxParticles: 20
                }
            ]
        },
        land: {
            duration: 26,
            exit: { stop: 10, drain: 18 },
            emitters: [
                {
                    name: "shockring", bind: "point", fit: "none", offset: [0, 0.06, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/ring/mediumring",
                    burst: { count: 1, at: 0 },
                    shape: { kind: "ring", radius: 1.1, rotation: [90, 0, 0] },
                    direction: "outward", speed: [0.12, 0.34],
                    lifetime: [8, 15], size: [0.9, 0.3], sizeMode: "index",
                    color: 0xFFF6DC, alpha: [0.85, 0], render: "translucent", light: "world", maxParticles: 8
                },
                {
                    name: "dust", bind: "point", fit: "none", offset: [0, 0.1, 0], height: 0,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: { data: "shock", fallback: 24 }, at: 0 },
                    shape: { kind: "circle", radius: 1.1, thickness: 0.2 },
                    direction: "outward", speed: [0.06, 0.26], gravity: 0.03, drag: 0.9,
                    lifetime: [9, 17], size: [0.08, 0.01],
                    color: 0xBFD9EF, alpha: [0.6, 0], light: "world", maxParticles: 90
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_skyattack", 1, SkyAttackDefinition);
